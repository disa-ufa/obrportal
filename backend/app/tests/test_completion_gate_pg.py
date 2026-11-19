import asyncio
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text

from app.core.security import decode_access_token
from app.models.course import Course
from app.models.course_module import CourseModule
from app.models.course_lesson import CourseLesson
from app.models.lesson_block import LessonBlock
from app.models.lesson_progress import LessonProgress
from app.models.quiz_attempt import QuizAttempt
from app.models.assignment_submission import AssignmentSubmission
from app.models.enrollment_employment_details import EnrollmentEmploymentDetails
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.learner_profile import LearnerProfile
from app.models.learning_group import LearningGroup, LearningGroupMember
from app.models.organization import Organization
from app.models.registry_obligation import RegistryObligation, RegistrySubmissionAttempt
from app.models.registry_submission_batch import RegistrySubmissionBatch
from app.models.role import Permission, RolePermission, UserRole
from app.models.user import User
from app.services.registry_action_lockset import RegistrySourceFence
from app.services.registry_source_write_scope import acquire_discovered_registry_source_write_scope
from test_enrollment_employment import stand
from test_registry_applicability_writer_pg import pg_applicability_db


def configure_test_course(course):
    course.frdo_requirement_mode = course.mintrud_requirement_mode = "not_required"


@pytest.mark.asyncio
async def test_administrative_routes_and_group_atomicity(stand):
    client = stand.client
    headers = stand.tokens["admin"]
    actor = decode_access_token(headers["Authorization"].split()[1])["sub"]
    async with stand.maker.begin() as session:
        grant = await session.scalar(select(UserRole).where(UserRole.user_id == actor))
        for code in ("admin.users.write", "org.groups.write"):
            permission = await session.scalar(select(Permission).where(Permission.code == code))
            if permission is None:
                permission = Permission(code=code, name=code)
                session.add(permission)
                await session.flush()
            session.add(RolePermission(role_id=grant.role_id, permission_id=permission.id))
        run = uuid4().hex
        organization = Organization(name="Synthetic", inn=str(int(run, 16) % 10**10).zfill(10))
        course = Course(slug="m3-" + run, title="Synthetic", is_active=True)
        configure_test_course(course)
        session.add_all([organization, course])
        await session.flush()
        session.add(UserRole(user_id=actor, role_id=grant.role_id, organization_id=organization.id))
        group = LearningGroup(organization_id=organization.id, name="Synthetic")
        session.add(group)
        active = await session.get(Enrollment, stand.ids[0])
        configure_test_course(await session.get(Course, active.course_id))
        old_obligation = RegistryObligation(
            enrollment_id=stand.ids[2], registry="mintrud", status="exported",
        )
        session.add(old_obligation)
        await session.flush()
        session.add_all([
            RegistrySubmissionAttempt(obligation_id=old_obligation.id, attempt_no=1),
            RegistrySubmissionBatch(
                obligation_count=1, record_count=1, artifact_path="fixture/export.xml", artifact_sha256="a" * 64,
            ),
        ])
        learners = [User(email=f"m3-{run}-{i}@example.invalid", hashed_password="fixture") for i in range(2)]
        session.add_all(learners)
        await session.flush()
        group_id, course_id, missing_id = group.id, course.id, learners[1].id
        session.add(LearnerProfile(user_id=learners[0].id, first_name="Ready", last_name="Synthetic"))
        session.add_all([LearningGroupMember(learning_group_id=group_id, user_id=u.id) for u in learners])

    payload = {"course_id": course_id, "status": "completed"}
    single = await client.post("/api/v1/admin/enrollments", headers=headers, json={**payload, "user_id": missing_id})
    assert single.status_code == 409 and single.json()["detail"]["code"] == "completion.profile_incomplete"
    denied = await client.patch(f"/api/v1/admin/enrollments/{stand.ids[0]}", headers=headers, json={"status": "completed"})
    assert denied.status_code == 409 and denied.json()["detail"]["reason"] == "learner_profile"
    for prefix in ("admin", "org"):
        response = await client.post(f"/api/v1/{prefix}/enrollments/group", headers=headers,
                                     json={**payload, "learning_group_id": group_id})
        assert response.status_code == 409, response.text
        assert [row["user_id"] for row in response.json()["detail"]["blocked_enrollments"]] == [missing_id]
    async with stand.maker() as session:
        assert await session.scalar(select(func.count()).select_from(Enrollment).where(Enrollment.course_id == course_id)) == 0
        assert await session.scalar(select(func.count()).select_from(DocumentRecord).where(DocumentRecord.course_id == course_id)) == 0
        active = await session.get(Enrollment, stand.ids[0])
        assert active.status == "active" and active.completed_at is None

    async def historical_snapshot():
        async with stand.maker() as session:
            return [(await session.execute(text(sql))).scalars().all() for sql in (
                "SELECT row_to_json(t)::text FROM document_records t ORDER BY id",
                "SELECT row_to_json(t)::text FROM registry_obligations t ORDER BY id",
                "SELECT row_to_json(t)::text FROM registry_submission_batches t ORDER BY id",
                "SELECT row_to_json(t)::text FROM registry_submission_batch_items t ORDER BY id",
                "SELECT row_to_json(t)::text FROM registry_submission_attempts t ORDER BY id",
                "SELECT row_to_json(t)::text FROM registry_applicability_events t ORDER BY id",
            )]
    before = await historical_snapshot()
    historical = await client.patch(f"/api/v1/admin/enrollments/{stand.ids[2]}", headers=headers, json={"status": "completed"})
    assert historical.status_code == 200 and historical.json()["status"] == "completed"
    assert await historical_snapshot() == before

    # A completed record and its historical registry/document snapshots must
    # not be silently reassigned to another organization or learning group.
    for field, value in (
        ("organization_id", str(organization.id)),
        ("learning_group_id", str(group_id)),
    ):
        denied = await client.patch(
            f"/api/v1/admin/enrollments/{stand.ids[2]}",
            headers=headers, json={field: value},
        )
        assert denied.status_code == 409, denied.text
        assert denied.json()["detail"]["code"] == "completion.historical_completion_protected"
    async with stand.maker() as session:
        preserved = await session.get(Enrollment, stand.ids[2])
        assert preserved.organization_id is None
        assert preserved.learning_group_id is None
    assert await historical_snapshot() == before


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", (
    "completed_without_document", "started_without_document", "lesson_progress",
    "quiz_attempt", "assignment_submission", "employment_details",
    "registry_obligation", "empty_active",
))
async def test_admin_enrollment_delete_preserves_training_and_registry_history(stand, kind):
    """Synthetic PostgreSQL: no ordinary cascade of a learner's evidence."""
    headers = stand.tokens["admin"]
    actor = decode_access_token(headers["Authorization"].split()[1])["sub"]
    enrollment_id = stand.ids[3] if kind == "registry_obligation" else stand.ids[0]

    async with stand.maker.begin() as session:
        grant = await session.scalar(select(UserRole).where(UserRole.user_id == actor))
        permission = await session.scalar(select(Permission).where(Permission.code == "admin.users.write"))
        if permission is None:
            permission = Permission(code="admin.users.write", name="Synthetic admin enrollment permission")
            session.add(permission)
            await session.flush()
        if not await session.scalar(select(RolePermission.id).where(
            RolePermission.role_id == grant.role_id, RolePermission.permission_id == permission.id,
        )):
            session.add(RolePermission(role_id=grant.role_id, permission_id=permission.id))

        enrollment = await session.get(Enrollment, enrollment_id)
        if kind == "completed_without_document":
            enrollment.status = "completed"
        elif kind == "started_without_document":
            enrollment.started_at = enrollment.created_at
        elif kind == "employment_details":
            session.add(EnrollmentEmploymentDetails(
                enrollment_id=enrollment_id, profession_or_position="Synthetic role",
            ))
        elif kind in {"lesson_progress", "quiz_attempt", "assignment_submission"}:
            module = CourseModule(
                course_id=enrollment.course_id, title="Synthetic module", position=100,
            )
            session.add(module)
            await session.flush()
            lesson = CourseLesson(
                module_id=module.id, title="Synthetic lesson", content_type="text", position=100,
            )
            session.add(lesson)
            await session.flush()
            if kind == "lesson_progress":
                session.add(LessonProgress(enrollment_id=enrollment_id, lesson_id=lesson.id))
            else:
                block = LessonBlock(lesson_id=lesson.id, block_type="quiz" if kind == "quiz_attempt" else "assignment", position=1)
                session.add(block)
                await session.flush()
                if kind == "quiz_attempt":
                    session.add(QuizAttempt(
                        enrollment_id=enrollment_id, lesson_id=lesson.id,
                        block_id=block.id, attempt_number=1,
                    ))
                else:
                    session.add(AssignmentSubmission(
                        enrollment_id=enrollment_id, user_id=enrollment.user_id,
                        lesson_id=lesson.id, block_id=block.id,
                    ))

    response = await stand.client.delete(
        f"/api/v1/admin/enrollments/{enrollment_id}", headers=headers,
    )
    async with stand.maker() as session:
        persisted = await session.get(Enrollment, enrollment_id)
        if kind == "empty_active":
            assert response.status_code == 200, response.text
            assert persisted is None
        else:
            assert response.status_code == 409, response.text
            assert persisted is not None
            if kind == "registry_obligation":
                assert await session.scalar(select(RegistryObligation.id).where(
                    RegistryObligation.enrollment_id == enrollment_id
                )) is not None
            elif kind == "lesson_progress":
                assert await session.scalar(select(LessonProgress.id).where(
                    LessonProgress.enrollment_id == enrollment_id
                )) is not None
            elif kind == "quiz_attempt":
                assert await session.scalar(select(QuizAttempt.id).where(
                    QuizAttempt.enrollment_id == enrollment_id
                )) is not None
            elif kind == "assignment_submission":
                assert await session.scalar(select(AssignmentSubmission.id).where(
                    AssignmentSubmission.enrollment_id == enrollment_id
                )) is not None
            elif kind == "employment_details":
                assert await session.scalar(select(EnrollmentEmploymentDetails.id).where(
                    EnrollmentEmploymentDetails.enrollment_id == enrollment_id
                )) is not None


@pytest.mark.asyncio
async def test_profile_writer_fence_prevents_stale_completion(stand):
    enrollment_id = stand.ids[0]
    async with stand.maker.begin() as session:
        enrollment = await session.get(Enrollment, enrollment_id)
        configure_test_course(await session.get(Course, enrollment.course_id))
        learner = enrollment.user_id
        session.add(LearnerProfile(user_id=learner, first_name="Synthetic", last_name="Ready"))

    waiter = None
    try:
        async with stand.maker.begin() as writer:
            blocker = await writer.scalar(text("SELECT pg_backend_pid()"))
            await acquire_discovered_registry_source_write_scope(
                session=writer, roots=(RegistrySourceFence("learner", learner),),
            )
            profile = await writer.scalar(select(LearnerProfile).where(LearnerProfile.user_id == learner))
            profile.first_name = None
            await writer.flush()
            waiter = asyncio.create_task(stand.client.post(
                f"/api/v1/account/courses/{enrollment_id}/complete", headers=stand.tokens["owner"],
            ))
            for _ in range(200):
                async with stand.maker() as observer:
                    blocking = await observer.scalar(text(
                        "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE :pid = ANY(pg_blocking_pids(pid)))"
                    ), {"pid": blocker})
                if blocking:
                    break
                assert not waiter.done()
                await asyncio.sleep(0.01)
            else:
                pytest.fail("Completion did not wait on the profile source fence")
        denied = await asyncio.wait_for(waiter, timeout=5)
        assert denied.status_code == 409
        assert denied.json()["detail"]["missing_fields"][0]["field"] == "learner_profile.first_name"
        async with stand.maker() as session:
            assert (await session.get(Enrollment, enrollment_id)).status == "active"
            assert await session.scalar(select(DocumentRecord.id).where(DocumentRecord.enrollment_id == enrollment_id)) is None
            assert await session.scalar(select(RegistryObligation.id).where(
                RegistryObligation.enrollment_id == enrollment_id)) is None
    finally:
        if waiter and not waiter.done():
            waiter.cancel()
            await asyncio.gather(waiter, return_exceptions=True)
