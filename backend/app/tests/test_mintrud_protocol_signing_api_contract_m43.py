"""Static contract checks; NOT an HTTP or live DB integration test."""
import ast
from pathlib import Path

API = Path(__file__).resolve().parents[1] / "api" / "v1" / "mintrud_protocol_drafts.py"
MODEL = Path(__file__).resolve().parents[1] / "models" / "mintrud_knowledge_protocol.py"
MIGRATION = Path(__file__).resolve().parents[2] / "alembic" / "versions" / "20261103_mintrud_protocol_signed.py"


def _function(name):
    tree = ast.parse(API.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name:
            return node
    raise AssertionError(f"missing endpoint {name}")


def test_confirm_signature_has_explicit_write_permission_and_post_route():
    node = _function("confirm_protocol_paper_signature")
    code = ast.get_source_segment(API.read_text(encoding="utf-8"), node)
    assert 'require_permission("mintrud.write")' in code
    assert any('confirm-signature' in ast.unparse(d) and '.post(' in ast.unparse(d) for d in node.decorator_list)
    assert 'method="POST"' not in code  # route decorator handles HTTP method


def test_confirm_signature_locks_row_and_rolls_back_on_error():
    node = _function("confirm_protocol_paper_signature")
    code = ast.get_source_segment(API.read_text(encoding="utf-8"), node)
    assert ".with_for_update()" in code
    assert "await session.commit()" in code
    assert "await session.rollback()" in code
    assert "AuditEvent(" in code


def test_confirmation_does_not_mutate_mintrud_context_or_export():
    node = _function("confirm_protocol_paper_signature")
    code = ast.get_source_segment(API.read_text(encoding="utf-8"), node)
    assert "apply_mintrud_protocol_sync(" not in code
    assert "MintrudRegistryContext(" not in code
    assert "export_mintrud" not in code


def test_required_bool_attestation_and_idempotency():
    text = API.read_text(encoding="utf-8")
    assert "confirmed_paper_original_signed: Literal[True]" in text
    assert "confirmation_id: UUID" in text
    assert "signed_source_sha256" in text


def test_fields_in_model_and_migration_match():
    model = MODEL.read_text(encoding="utf-8")
    migration = MIGRATION.read_text(encoding="utf-8")
    names = (
        "signed_at", "signed_on", "signed_by_user_id", "signing_request_id", "signed_source_sha256",
        "signed_scan_path", "signed_scan_sha256", "signed_scan_size", "signed_scan_media_type",
        "signed_scan_uploaded_at", "signed_scan_uploaded_by_user_id",
    )
    for name in names:
        assert name in model
        assert f'"{name}"' in migration
