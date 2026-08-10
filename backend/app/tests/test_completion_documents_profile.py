from types import SimpleNamespace

import pytest

from app.services import completion_documents as service


def make_profile(
    *,
    last_name: str | None = None,
    first_name: str | None = None,
    middle_name: str | None = None,
):
    return SimpleNamespace(
        last_name=last_name,
        first_name=first_name,
        middle_name=middle_name,
    )


def make_user(full_name: str | None):
    return SimpleNamespace(full_name=full_name)


def test_completion_name_prefers_complete_learner_profile() -> None:
    result = service.build_completion_learner_full_name(
        learner_profile=make_profile(
            last_name="  Иванов ",
            first_name=" Иван ",
            middle_name="  Иванович  ",
        ),
        learner=make_user("Старое ФИО"),
    )

    assert result == "Иванов Иван Иванович"


def test_completion_name_accepts_profile_without_middle_name() -> None:
    result = service.build_completion_learner_full_name(
        learner_profile=make_profile(
            last_name="Петров",
            first_name="Пётр",
        ),
        learner=make_user("Старое ФИО"),
    )

    assert result == "Петров Пётр"


def test_completion_name_falls_back_to_user_for_incomplete_profile() -> None:
    result = service.build_completion_learner_full_name(
        learner_profile=make_profile(
            last_name="Сидоров",
        ),
        learner=make_user("  Сидоров Сидор Сидорович  "),
    )

    assert result == "Сидоров Сидор Сидорович"


def test_completion_name_uses_partial_profile_when_user_name_missing() -> None:
    result = service.build_completion_learner_full_name(
        learner_profile=make_profile(
            last_name="Сидоров",
        ),
        learner=make_user(None),
    )

    assert result == "Сидоров"


def test_completion_name_has_safe_placeholder_without_identity_data() -> None:
    result = service.build_completion_learner_full_name(
        learner_profile=None,
        learner=make_user(None),
    )

    assert result == "ФИО обучающегося"


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class ContextSession:
    def __init__(self, values):
        self.values = list(values)
        self.execute_count = 0

    async def execute(self, query):
        del query
        self.execute_count += 1
        return ScalarResult(self.values.pop(0))


@pytest.mark.asyncio
async def test_load_completion_context_includes_learner_profile() -> None:
    course = object()
    learner = object()
    learner_profile = object()
    organization = object()

    session = ContextSession(
        [course, learner, learner_profile, organization]
    )
    enrollment = SimpleNamespace(
        course_id="course-1",
        user_id="user-1",
        organization_id="organization-1",
    )

    result = await service.load_completion_document_context(
        enrollment,
        session,
    )

    assert result == (
        course,
        learner,
        learner_profile,
        organization,
    )
    assert session.execute_count == 4


def test_write_completion_pdf_uses_profile_name(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured = {}

    def render(context):
        captured["context"] = context
        return b"%PDF-test"

    def write(relative_path, content):
        captured["path"] = relative_path
        captured["content"] = content
        return "generated/completion/test.pdf"

    monkeypatch.setattr(
        service,
        "render_completion_document_pdf",
        render,
    )
    monkeypatch.setattr(
        service,
        "write_private_storage_file",
        write,
    )

    enrollment = SimpleNamespace(
        completed_at=None,
    )
    document = SimpleNamespace(
        document_type="Сертификат",
        document_number="AUTO-PROFILE",
        verification_code="verify-profile",
    )
    course = SimpleNamespace(
        title="Тестовый курс",
        hours=36,
    )

    result = service.write_completion_document_pdf_to_storage(
        enrollment=enrollment,
        document=document,
        course=course,
        learner=make_user("Старое ФИО"),
        learner_profile=make_profile(
            last_name="Иванов",
            first_name="Иван",
            middle_name="Иванович",
        ),
        organization=None,
    )

    assert result == "generated/completion/test.pdf"
    assert (
        captured["context"].learner_full_name
        == "Иванов Иван Иванович"
    )
    assert captured["content"] == b"%PDF-test"
