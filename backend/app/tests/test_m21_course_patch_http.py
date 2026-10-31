"""Real authenticated course PATCH contract on an explicitly disposable server."""
from uuid import uuid4

from app.tests import test_admin_frdo_registry_api as api
from app.tests.test_admin_frdo_batches_http import _require_disposable_environment, _assert_status


def test_protected_course_patch_preserves_http_rbac_and_validation():
    _require_disposable_environment()
    administrator = api.login(api.ADMIN_EMAIL, api.ADMIN_PASSWORD)
    learner = api.login(api.LEARNER_EMAIL, api.LEARNER_PASSWORD)
    course = _assert_status(api.request_json('POST', '/api/v1/admin/courses',
        {'slug': 'm21-http-' + uuid4().hex, 'title': 'Before', 'document_type': 'certificate'}, token=administrator), 201)
    path = '/api/v1/admin/courses/' + course['id']
    changes = dict(document_type='diploma', regulatory_program_type='occupational_safety_training',
                   frdo_requirement_mode='not_required', mintrud_requirement_mode='required', title='After')
    try:
        _assert_status(api.request_json('PATCH', path, changes), 401)
        _assert_status(api.request_json('PATCH', path, changes, token=learner), 403)
        unchanged = _assert_status(api.request_json('GET', path, token=administrator), 200)
        assert unchanged['title'] == 'Before' and unchanged['document_type'] == 'certificate'
        saved = _assert_status(api.request_json('PATCH', path, changes, token=administrator), 200)
        assert all(saved[key] == value for key, value in changes.items())
        _assert_status(api.request_json('PATCH', path, {}, token=administrator), 400)
        _assert_status(api.request_json('PATCH', path, {'mintrud_requirement_mode': None}, token=administrator), 422)
        latest = _assert_status(api.request_json('GET', path, token=administrator), 200)
        assert all(latest[key] == value for key, value in changes.items())
    finally:
        _assert_status(api.request_json('DELETE', path, token=administrator), 200)
