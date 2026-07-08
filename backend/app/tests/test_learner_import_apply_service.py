from __future__ import annotations

from app.services.learner_import_batches import (
    assign_learner_role_if_available,
    build_import_row_fallback_email,
    normalize_import_text,
)


def test_build_import_row_fallback_email_is_stable_and_safe() -> None:
    email = build_import_row_fallback_email("Batch-ID_1234567890abcdef", 7)

    assert email == "import-batchid123456789-row-7@obrportal.local"


def test_build_import_row_fallback_email_handles_empty_batch_id() -> None:
    email = build_import_row_fallback_email("", 3)

    assert email.startswith("import-")
    assert email.endswith("-row-3@obrportal.local")


def test_normalize_import_text_strips_none_and_spaces() -> None:
    assert normalize_import_text(None) == ""
    assert normalize_import_text("  ??????  ") == "??????"


async def test_assign_learner_role_if_available_skips_when_role_is_missing() -> None:
    class NoopSession:
        def add(self, instance: object) -> None:
            raise AssertionError("add should not be called when learner role is missing")

        async def flush(self) -> None:
            raise AssertionError("flush should not be called when learner role is missing")

    assigned = await assign_learner_role_if_available(
        NoopSession(),
        user_id="user-1",
        learner_role=None,
    )

    assert assigned is False
