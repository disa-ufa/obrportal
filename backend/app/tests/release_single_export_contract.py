"""Real HTTP denial plus unchanged approval/history and independent format coverage."""
import asyncio
import hashlib
import json
from pathlib import Path

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.models.registry_obligation import RegistryObligation
from app.services.compliance_registry_attempts import (
    validate_registry_approval_current, RegistrySubmissionAttemptError,
)


async def assert_stale_approval(obligation_id):
    engine=create_async_engine(settings.database_url)
    try:
        async with async_sessionmaker(engine)() as session:
            obligation=await session.get(RegistryObligation,obligation_id)
            with pytest.raises(RegistrySubmissionAttemptError, match='stale'):
                await validate_registry_approval_current(session, obligation=obligation)
    finally:
        await engine.dispose()


async def state_and_format(obligation_id, registry, kind):
    engine=create_async_engine(settings.database_url)
    try:
        async with async_sessionmaker(engine,expire_on_commit=False)() as session:
            await session.execute(text('BEGIN READ ONLY'))
            obligation=await session.get(RegistryObligation,obligation_id)
            assert obligation.status=='approved'
            await validate_registry_approval_current(session,obligation=obligation)
            from app.services.compliance_registry_approval import fingerprint_registry_approval_snapshot
            assert obligation.approval_event_id
            assert fingerprint_registry_approval_snapshot(obligation.approval_snapshot_json)==obligation.approval_fingerprint
            if kind=='export':
                from app.services.compliance_registry_export import build_registry_export_package, serialize_registry_export_package
                package=build_registry_export_package(obligation)
                content=serialize_registry_export_package(package)
                assert json.loads(content)==package
            elif registry=='mintrud':
                from app.services.mintrud_eisot_xml import serialize_mintrud_eisot_xml_v109
                from app.services.mintrud_eisot_xsd import validate_mintrud_eisot_xml_v109
                from xml.etree import ElementTree
                content=serialize_mintrud_eisot_xml_v109(obligation.approval_snapshot_json)
                validate_mintrud_eisot_xml_v109(content)
                assert ElementTree.fromstring(content).findall('RegistryRecord')
            else:
                from app.services.frdo_po_portal_artifact import prepare_frdo_po_portal_artifact
                from app.services.frdo_po_portal_contract import read_verified_frdo_po_template_bytes
                from app.services.frdo_po_xlsx_validator import validate_frdo_po_xlsx
                content=prepare_frdo_po_portal_artifact(approval_snapshot=obligation.approval_snapshot_json)
                validate_frdo_po_xlsx(content=content,approval_snapshot=obligation.approval_snapshot_json,
                                     template_bytes=read_verified_frdo_po_template_bytes(program_type=obligation.approval_snapshot_json["course"]["regulatory_program_type"]))
                assert content.startswith(b'PK')
            assert content
            saved=await session.scalar(text('SELECT to_jsonb(o) FROM registry_obligations o WHERE id=:id'),{'id':obligation_id})
            attempts=await session.scalar(text('SELECT count(*) FROM registry_submission_attempts WHERE obligation_id=:id'),{'id':obligation_id})
            assert attempts==0
            await session.rollback()
            return saved
    finally:
        await engine.dispose()


def files():
    root=Path(settings.document_storage_dir)
    return {str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}


def check_single_export_disabled(api,registry,kind):
    create=getattr(api,'create_'+registry+'_fixture')
    fixture=create(**({'with_profile':True} if registry=='frdo' else {'with_context':True}),obligation_status='needs_approval')
    try:
        admin=api.login(api.ADMIN_EMAIL,api.ADMIN_PASSWORD)
        learner=api.login(api.LEARNER_EMAIL,api.LEARNER_PASSWORD)
        path='/api/v1/admin/'+registry+'/obligations/'+fixture['obligation_id']
        code,approved=api.request_json('POST',path+'/approve',token=admin)
        assert code==200 and approved['status']=='approved' and not approved['readiness_errors']
        before=asyncio.run(state_and_format(fixture['obligation_id'],registry,kind))
        artifacts=files()
        actions=getattr(api,'get_'+registry+'_audit_actions')(fixture['obligation_id'])
        code,_=api.request_json('POST',path+'/'+kind,token=learner)
        assert code==403
        for target in (path+'/'+kind,path+'/'+kind,'/api/v1/admin/'+registry+'/obligations/00000000-0000-0000-0000-000000000000/'+kind):
            code,result=api.request_json('POST',target,token=admin)
            assert code==409 and result['detail']['code']=='registry.single_export.disabled'
        code,history=api.request_json('GET',path+'/attempts',token=admin)
        assert code==200 and history==[]
        assert asyncio.run(state_and_format(fixture['obligation_id'],registry,kind))==before
        assert files()==artifacts
        assert getattr(api,'get_'+registry+'_audit_actions')(fixture['obligation_id'])==actions
    finally:
        getattr(api,'cleanup_'+registry+'_fixtures')([fixture])
