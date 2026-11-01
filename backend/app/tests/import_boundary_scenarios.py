"""Real PostgreSQL scenarios. No replacement scope, auth, fence or writer."""
import asyncio
import os
import re
from uuid import uuid4
from sqlalchemy import select, text, event
from sqlalchemy.ext.asyncio import create_async_engine
from app.models.user import User
from app.models.enrollment import Enrollment
from app.models.learner_profile import LearnerProfile
from app.models.import_batch import ImportBatch, ImportRow
from app.models.role import Role, UserRole
from app.tests.test_import_writers_pg import batch_setup, prepare, tx
from app.services import learner_import_batches as service


async def snapshot(maker):
    """Compare all persisted application rows without exposing their contents."""
    async with maker() as s:
        names=(await s.scalars(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))).all()
        result={}
        for name in names:
            assert re.fullmatch(r'[a-zA-Z0-9_]+',name)
            result[name]=await s.scalar(text(f'SELECT md5(coalesce(string_agg(v, chr(10) ORDER BY v), \'\')) FROM (SELECT row_to_json(t)::text AS v FROM "{name}" t) q'))
        return result


async def rows(maker,bid):
    async with maker() as s:
        return (await s.scalars(select(ImportRow).where(ImportRow.batch_id==bid).order_by(ImportRow.row_number))).all()


async def apply(maker,bid,actor):
    async with tx() as s:
        batch=await prepare(s,bid,actor)
        result=await service.apply_learner_import_batch(s,batch=batch)
        await s.commit()
    return result


async def reject_creation(env, *, inactive=False, identity=False):
    # Legacy test entry point. RC2 now supports controlled creation.
    e, maker, data = env
    bid, actor, oid = await batch_setup(maker, data)
    new_email = uuid4().hex + '@test.invalid' if identity else None
    target_course = data[0][1] if identity else data[1][1]

    async with maker.begin() as s:
        user = await s.get(User, data[0][0])
        user.is_active = not inactive
        if identity:
            row = await s.scalar(
                select(ImportRow).where(ImportRow.batch_id == bid)
            )
            row.normalized_data_json = {
                'email': new_email, 'first_name': 'New',
            }
        else:
            (await s.get(ImportBatch, bid)).course_id = target_course

    before = await snapshot(maker)
    result = await apply(maker, bid, actor)

    assert result.error_rows_count == 0
    assert result.created_users_count == int(identity)
    assert result.created_enrollments_count == 1
    assert result.created_profiles_count == 1

    needs_invitation = inactive or identity
    invitations = result.invitation_candidates
    notifications = result.course_notification_candidates

    assert len(invitations) == int(needs_invitation)
    assert len(notifications) == int(not needs_invitation)

    actual = await rows(maker, bid)
    assert len(actual) == 1
    row = actual[0]
    assert row.status == 'applied'
    assert row.user_id and row.learner_profile_id and row.enrollment_id

    async with maker() as s:
        user = await s.get(User, row.user_id)
        enrollment = await s.get(Enrollment, row.enrollment_id)
        batch = await s.get(ImportBatch, bid)

        assert batch.status == 'applied'
        assert user is not None and enrollment is not None
        assert enrollment.user_id == user.id
        assert enrollment.course_id == target_course
        assert enrollment.organization_id == oid
        assert enrollment.status == 'assigned'
        assert (await s.get(Enrollment, data[0][2])).status == 'completed'

        if identity:
            assert user.id != data[0][0]
            assert user.email == new_email
            assert user.is_active is False
        else:
            assert user.id == data[0][0]
            assert user.is_active is (not inactive)

    assert (await snapshot(maker))['document_records'] == (
        before['document_records']
    )

    candidates = invitations if needs_invitation else notifications
    assert len(candidates) == 1
    assert candidates[0].user_id == row.user_id
    assert candidates[0].course_id == target_course


async def existing(env, *, inactive=False, course=True):
    e,maker,data=env
    bid,actor,oid=await batch_setup(maker,data)
    async with maker.begin() as s:
        (await s.get(User,data[0][0])).is_active=not inactive
        if not course:(await s.get(ImportBatch,bid)).course_id=None
    result=await apply(maker,bid,actor)
    assert result.error_rows_count==0
    assert result.created_users_count==result.created_enrollments_count==0
    assert result.course_notification_candidates==()
    if inactive and not course:
        assert len(result.invitation_candidates)==1
        assert result.invitation_candidates[0].user_id==data[0][0]
        assert result.invitation_candidates[0].course_id is None
    else:assert result.invitation_candidates==()
    async with maker() as s:
        assert (await s.get(ImportBatch,bid)).status=='applied'
        en=await s.get(Enrollment,data[0][2])
        assert en.status=='completed'
        if course:assert en.organization_id==oid
    return result


async def integrity(env,monkeypatch,mode):
    e,maker,data=env
    async with maker() as s:email=(await s.get(User,data[0][0])).email
    bid,actor,oid=await batch_setup(maker,data,extra={'email':email,'first_name':'Recovered'})
    original=service.assign_learner_role_from_apply_lookups
    loader=service.load_learner_import_apply_lookups
    calls=[];loads=[];refreshed=[];trace=[]
    async def fail_first(s,**kw):
        assert s.in_nested_transaction()
        calls.append(True)
        if len(calls)==1:
            s.add(Role(code='learner_fl',name='deliberate constraint failure'))
            await s.flush()  # actual PostgreSQL UNIQUE violation in the savepoint
        return await original(s,**kw)
    async def observe_loader(*a,**kw):
        loads.append(True)
        return await loader(*a,**kw)
    def record(c,cur,stmt,params,ctx,many):trace.append(stmt.upper())
    monkeypatch.setattr(service,'assign_learner_role_from_apply_lookups',fail_first)
    monkeypatch.setattr(service,'load_learner_import_apply_lookups',observe_loader)
    event.listen(e.sync_engine,'before_cursor_execute',record)
    try:
        async with tx() as s:
            b=await prepare(s,bid,actor)
            refresh=s.refresh
            async def observe_refresh(obj,*a,**kw):
                await refresh(obj,*a,**kw)
                if isinstance(obj,ImportRow):refreshed.append(obj.id)
            monkeypatch.setattr(s,'refresh',observe_refresh)
            trace.clear()
            result=await service.apply_learner_import_batch(s,batch=b)
            assert result.error_rows_count==1 and result.created_profiles_count==1
            await s.commit()
    finally:event.remove(e.sync_engine,'before_cursor_execute',record)
    actual=await rows(maker,bid)
    assert [r.status for r in actual]==['error','applied']
    assert actual[0].error_summary=='Database constraint conflict while applying learner import row.'
    assert actual[0].user_id is None and actual[0].learner_profile_id is None
    assert len(calls)==2 and len(loads)==2
    assert refreshed==[actual[0].id]
    assert sum(t.startswith('SAVEPOINT ') for t in trace)==2
    assert sum(t.startswith('ROLLBACK TO SAVEPOINT ') for t in trace)==1
    assert result.created_users_count==result.created_enrollments_count==0
    async with maker() as s:
        p=await s.scalar(select(LearnerProfile).where(LearnerProfile.user_id==data[0][0]))
        assert p.first_name=='Recovered'
        assert (await s.get(Enrollment,data[0][2])).organization_id==oid
        assert (await s.get(ImportBatch,bid)).status=='applied'


async def phone_conflict(env):
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data)
    phone='+7'+str(uuid4().int)[:10]
    async with maker.begin() as s:
        (await s.get(User,data[1][0])).phone=phone
        r=await s.scalar(select(ImportRow).where(ImportRow.batch_id==bid))
        r.normalized_data_json={'email':uuid4().hex+'@test.invalid','phone':phone}
    result=await apply(maker,bid,actor)
    assert result.error_rows_count==1
    assert result.created_users_count==result.created_enrollments_count==result.created_profiles_count==0
    r=(await rows(maker,bid))[0]
    assert r.status=='error' and r.user_id is None and r.learner_profile_id is None and r.enrollment_id is None
    assert r.error_summary=='Phone belongs to another user with a different email.'
    async with maker() as s:
        assert (await s.get(Enrollment,data[0][2])).organization_id is None
        assert (await s.get(User,data[1][0])).phone==phone


async def reuse_profile(env,monkeypatch):
    e,maker,data=env
    async with maker() as s:email=(await s.get(User,data[0][0])).email
    bid,actor,_=await batch_setup(maker,data,extra={'email':email,'first_name':'Imported'})
    loader=service.load_learner_import_apply_lookups;calls=[]
    async def observe(*a,**kw):
        calls.append(True);return await loader(*a,**kw)
    monkeypatch.setattr(service,'load_learner_import_apply_lookups',observe)
    result=await apply(maker,bid,actor)
    assert len(calls)==1
    assert result.created_users_count==result.created_enrollments_count==0
    assert result.created_profiles_count==1 and result.error_rows_count==0
    actual=await rows(maker,bid)
    assert [r.status for r in actual]==['applied','applied']
    assert actual[0].user_id==actual[1].user_id==data[0][0]
    assert actual[0].learner_profile_id==actual[1].learner_profile_id


async def batched(env,monkeypatch):
    e,maker,data=env;bid,actor,_=await batch_setup(maker,data)
    async with maker.begin() as s:
        role=await s.scalar(select(Role).where(Role.code=='learner_fl'))
        first=await s.get(User,data[0][0])
        s.add(LearnerProfile(user_id=first.id,first_name='Imported',email=first.email))
        s.add(UserRole(user_id=first.id,role_id=role.id))
        for i in range(24):
            u=User(email=uuid4().hex+'@test.invalid',hashed_password='synthetic',is_active=True)
            s.add(u);await s.flush()
            s.add(LearnerProfile(user_id=u.id,first_name='Imported',email=u.email))
            s.add(Enrollment(user_id=u.id,course_id=data[0][1],status='assigned'))
            s.add(UserRole(user_id=u.id,role_id=role.id))
            s.add(ImportRow(batch_id=bid,row_number=i+2,status='valid',normalized_data_json={'email':u.email,'first_name':'Imported'}))
    loader=service.load_learner_import_apply_lookups;queries=[];calls=[]
    def record(c,cur,stmt,params,ctx,many):queries.append(stmt)
    async def observe(*a,**kw):
        calls.append(True);event.listen(e.sync_engine,'before_cursor_execute',record)
        try:return await loader(*a,**kw)
        finally:event.remove(e.sync_engine,'before_cursor_execute',record)
    monkeypatch.setattr(service,'load_learner_import_apply_lookups',observe)
    result=await apply(maker,bid,actor)
    assert len(calls)==1 and len(queries)==4
    assert result.created_users_count==result.created_profiles_count==result.created_enrollments_count==0
    assert result.assigned_learner_roles_count==result.error_rows_count==0
    assert len(await rows(maker,bid))==25
    assert all(r.status=='applied' for r in await rows(maker,bid))


async def middle_name(env,monkeypatch):
    e,maker,data=env;bid,actor,_=await batch_setup(maker,data)
    async with maker.begin() as s:
        user=await s.get(User,data[0][0])
        s.add(LearnerProfile(user_id=user.id,first_name='Imported',email=user.email))
        r=await s.scalar(select(ImportRow).where(ImportRow.batch_id==bid))
        r.normalized_data_json={**r.normalized_data_json,'middle_name':'Ivanovich'}
    calls=[]
    for name in ['lock_registry_approvals_for_learner_profile','invalidate_registry_approvals_for_learner_profile','refresh_registry_readiness_for_user']:
        original=getattr(service,name)
        async def observe(*a,_name=name,_original=original,**kw):
            calls.append((_name,kw.get('changed_fields')))
            return await _original(*a,**kw)
        monkeypatch.setattr(service,name,observe)
    result=await apply(maker,bid,actor)
    assert result.updated_profiles_count==1 and result.created_profiles_count==0
    assert [(n,tuple(f)) for n,f in calls]==[('lock_registry_approvals_for_learner_profile',('middle_name',)),('invalidate_registry_approvals_for_learner_profile',('middle_name',))]
    async with maker() as s:
        assert (await s.scalar(select(LearnerProfile).where(LearnerProfile.user_id==data[0][0]))).middle_name=='Ivanovich'


async def http_contract(env, monkeypatch):
    import httpx
    from fastapi import FastAPI
    from app.api.v1 import admin
    from app.core.security import create_access_token
    from app.services.email_delivery import EmailDeliveryResult

    e, maker, data = env
    bid, actor, oid = await batch_setup(maker, data)

    app = FastAPI()
    app.add_api_route(
        '/imports/{batch_id}/apply',
        admin.apply_learner_import,
        methods=['POST'],
    )

    deliveries = []

    def simulated_mail(kind, **kwargs):
        assert kwargs['recipient'] == kwargs['user_email']
        deliveries.append((kind, kwargs['recipient']))
        return EmailDeliveryResult(
            status='skipped',
            recipient=kwargs['recipient'],
            subject='Synthetic notification',
            detail='No external email sent.',
        )

    monkeypatch.setattr(
        admin, 'send_password_setup_email',
        lambda **kw: simulated_mail('setup', **kw),
    )
    monkeypatch.setattr(
        admin, 'send_course_assignment_email',
        lambda **kw: simulated_mail('course', **kw),
    )

    async with maker() as s:
        existing_email = (await s.get(User, data[0][0])).email

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url='http://synthetic',
    ) as client:
        url = '/imports/' + bid + '/apply'
        headers = {
            'Authorization': 'Bearer ' + create_access_token(actor)
        }

        before = await snapshot(maker)
        assert (await client.post(url)).status_code == 401
        assert (
            await client.post(
                url,
                headers={
                    'Authorization': 'Bearer '
                    + create_access_token(data[0][0])
                },
            )
        ).status_code == 403
        assert await snapshot(maker) == before
        assert deliveries == []

        # Existing active learner receives a NEW course.
        async with maker.begin() as s:
            (await s.get(ImportBatch, bid)).course_id = data[1][1]

        response = await client.post(url, headers=headers)
        assert response.status_code == 200, response.text
        payload = response.json()

        assert payload['created_users_count'] == 0
        assert payload['created_enrollments_count'] == 1
        assert payload['invitations'] == []
        assert len(payload['course_notifications']) == 1
        assert payload['course_notifications'][0]['course_id'] == data[1][1]
        assert deliveries == [('course', existing_email)]

        async with maker() as s:
            enrollment = await s.scalar(
                select(Enrollment).where(
                    Enrollment.user_id == data[0][0],
                    Enrollment.course_id == data[1][1],
                )
            )
            assert enrollment is not None
            assert enrollment.status == 'assigned'
            assert enrollment.organization_id == oid

        # New learner is created inactive, with invitation.
        fresh_bid, _, fresh_org = await batch_setup(maker, data)
        fresh_email = uuid4().hex + '@test.invalid'

        async with maker.begin() as s:
            row = await s.scalar(
                select(ImportRow).where(ImportRow.batch_id == fresh_bid)
            )
            row.normalized_data_json = {
                'email': fresh_email,
                'first_name': 'New',
            }

        fresh_response = await client.post(
            '/imports/' + fresh_bid + '/apply',
            headers=headers,
        )
        assert fresh_response.status_code == 200, fresh_response.text
        fresh = fresh_response.json()

        assert fresh['created_users_count'] == 1
        assert fresh['created_enrollments_count'] == 1
        assert fresh['course_notifications'] == []
        assert len(fresh['invitations']) == 1
        assert deliveries == [
            ('course', existing_email),
            ('setup', fresh_email),
        ]

        async with maker() as s:
            user = await s.scalar(
                select(User).where(User.email == fresh_email)
            )
            assert user is not None
            assert user.is_active is False
            enrollment = await s.scalar(
                select(Enrollment).where(
                    Enrollment.user_id == user.id,
                    Enrollment.course_id == data[0][1],
                )
            )
            assert enrollment is not None
            assert enrollment.organization_id == fresh_org

    assert len(deliveries) == 2


def live_snapshot():
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from app.core.config import settings
    async def read():
        marker=os.environ.get('OBRPORTAL_RECOVERY_DISPOSABLE_MARKER','')
        assert re.fullmatch(r'OBRPORTAL_STEP36F_SYNTHETIC_ONLY_[0-9a-f]{12}',marker)
        e=create_async_engine(str(settings.database_url),hide_parameters=True)
        try:
            async with e.connect() as c:
                assert (await c.execute(text("SELECT current_database(), host(inet_server_addr()), shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"))).one()==('regression_test','127.0.0.1',marker)
            return await snapshot(async_sessionmaker(e))
        finally:await e.dispose()
    return asyncio.run(read())
