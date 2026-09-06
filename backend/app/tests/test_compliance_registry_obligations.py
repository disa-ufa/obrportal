from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.models.course import Course
from app.models.registry_obligation import (
    RegistryObligation,
)
from app.services.compliance_registry_rules import (
    DECISION_NOT_REQUIRED,
    DECISION_REQUIRED,
    DECISION_UNDETERMINED,
    RegistryRequirementDecision,
)
from app.services.compliance_registry_obligations import (
    ensure_registry_obligations_for_completed_enrollment,
    initial_obligation_status_for_decision,
)


class FakeScalarResult:
    def __init__(self, values):
        self.values = list(values)

    def all(self):
        return list(self.values)


class FakeResult:
    def __init__(
        self,
        *,
        one=None,
        many=None,
    ):
        self.one = one
        self.many = list(many or [])

    def scalar_one_or_none(self):
        return self.one

    def scalars(self):
        return FakeScalarResult(self.many)


class FakeSession:
    def __init__(
        self,
        *,
        course,
        existing_obligations=None,
    ):
        self.course = course
        self.obligations = list(
            existing_obligations or []
        )
        self.added = []
        self.flush_calls = 0
        self.commit_calls = 0

    async def execute(self, statement):
        entity = statement.column_descriptions[
            0
        ].get("entity")

        if entity is Course:
            return FakeResult(
                one=self.course
            )

        if entity is RegistryObligation:
            return FakeResult(
                many=self.obligations
            )

        raise AssertionError(
            "Unexpected query entity: "
            + repr(entity)
        )

    def add(self, value):
        self.added.append(value)

        if isinstance(
            value,
            RegistryObligation,
        ):
            self.obligations.append(value)

    async def flush(self):
        self.flush_calls += 1

    async def commit(self):
        self.commit_calls += 1
        raise AssertionError(
            "Obligation service must not commit"
        )


def build_course(
    *,
    program_type: str,
    frdo_mode: str = "auto",
    mintrud_mode: str = "auto",
):
    return SimpleNamespace(
        id=str(uuid4()),
        regulatory_program_type=program_type,
        frdo_requirement_mode=frdo_mode,
        mintrud_requirement_mode=mintrud_mode,
    )


def build_completed_enrollment(
    course_id: str,
):
    return SimpleNamespace(
        id=str(uuid4()),
        user_id=str(uuid4()),
        course_id=course_id,
        status="completed",
        started_at=datetime.now(
            timezone.utc
        ),
        completed_at=datetime.now(
            timezone.utc
        ),
    )


def build_document(
    enrollment_id: str,
):
    return SimpleNamespace(
        id=str(uuid4()),
        enrollment_id=enrollment_id,
    )


@pytest.mark.parametrize(
    (
        "decision",
        "expected_status",
    ),
    [
        (
            DECISION_REQUIRED,
            "pending_data",
        ),
        (
            DECISION_NOT_REQUIRED,
            "not_required",
        ),
        (
            DECISION_UNDETERMINED,
            "needs_approval",
        ),
    ],
)
def test_initial_obligation_status_mapping(
    decision: str,
    expected_status: str,
) -> None:
    result = initial_obligation_status_for_decision(
        RegistryRequirementDecision(
            registry="test",
            decision=decision,
            rule_code="test.rule",
            rule_version="v1",
            reason="test",
        )
    )

    assert result == expected_status


def test_professional_program_creates_frdo_required_obligation() -> None:
    async def case():
        course = build_course(
            program_type=(
                "dpo_advanced_training"
            )
        )
        enrollment = (
            build_completed_enrollment(
                course.id
            )
        )
        document = build_document(
            enrollment.id
        )
        session = FakeSession(
            course=course
        )

        obligations = (
            await ensure_registry_obligations_for_completed_enrollment(
                enrollment=enrollment,
                session=session,
                document=document,
            )
        )

        assert set(obligations) == {
            "frdo",
            "mintrud",
        }

        frdo = obligations["frdo"]
        mintrud = obligations["mintrud"]

        assert frdo.status == "pending_data"
        assert (
            frdo.rule_code
            == "frdo.auto.professional_program"
        )
        assert (
            frdo.document_id
            == document.id
        )

        assert (
            mintrud.status
            == "not_required"
        )
        assert (
            mintrud.rule_code
            == "mintrud.auto.non_occupational_safety"
        )
        assert (
            mintrud.document_id
            == document.id
        )

        assert len(session.added) == 2
        assert session.flush_calls == 1
        assert session.commit_calls == 0

    asyncio.run(case())


def test_occupational_safety_creates_mintrud_required_obligation() -> None:
    async def case():
        course = build_course(
            program_type=(
                "occupational_safety_training"
            )
        )
        enrollment = (
            build_completed_enrollment(
                course.id
            )
        )
        session = FakeSession(
            course=course
        )

        obligations = (
            await ensure_registry_obligations_for_completed_enrollment(
                enrollment=enrollment,
                session=session,
            )
        )

        assert (
            obligations["frdo"].status
            == "needs_approval"
        )
        assert (
            obligations["mintrud"].status
            == "pending_data"
        )
        assert (
            obligations["mintrud"].rule_code
            == (
                "mintrud.auto."
                "occupational_safety_training"
            )
        )

    asyncio.run(case())


def test_unspecified_course_requires_manual_review_for_both() -> None:
    async def case():
        course = build_course(
            program_type="unspecified"
        )
        enrollment = (
            build_completed_enrollment(
                course.id
            )
        )
        session = FakeSession(
            course=course
        )

        obligations = (
            await ensure_registry_obligations_for_completed_enrollment(
                enrollment=enrollment,
                session=session,
            )
        )

        assert (
            obligations["frdo"].status
            == "needs_approval"
        )
        assert (
            obligations["mintrud"].status
            == "needs_approval"
        )

    asyncio.run(case())


def test_explicit_modes_drive_initial_obligation_statuses() -> None:
    async def case():
        course = build_course(
            program_type="other",
            frdo_mode="required",
            mintrud_mode="not_required",
        )
        enrollment = (
            build_completed_enrollment(
                course.id
            )
        )
        session = FakeSession(
            course=course
        )

        obligations = (
            await ensure_registry_obligations_for_completed_enrollment(
                enrollment=enrollment,
                session=session,
            )
        )

        assert (
            obligations["frdo"].status
            == "pending_data"
        )
        assert (
            obligations["frdo"].rule_code
            == "frdo.override.required"
        )

        assert (
            obligations["mintrud"].status
            == "not_required"
        )
        assert (
            obligations["mintrud"].rule_code
            == "mintrud.override.not_required"
        )

    asyncio.run(case())


def test_existing_obligations_are_not_reset_or_reclassified() -> None:
    async def case():
        course = build_course(
            program_type=(
                "occupational_safety_training"
            ),
            frdo_mode="required",
            mintrud_mode="required",
        )
        enrollment = (
            build_completed_enrollment(
                course.id
            )
        )
        document = build_document(
            enrollment.id
        )

        existing_frdo = RegistryObligation(
            registry="frdo",
            enrollment_id=enrollment.id,
            document_id=None,
            status="approved",
            rule_code="frdo.old.rule",
            rule_version="old-version",
            requirement_reason=(
                "Existing FRDO snapshot"
            ),
            readiness_errors=[],
        )

        existing_mintrud = RegistryObligation(
            registry="mintrud",
            enrollment_id=enrollment.id,
            document_id=None,
            status="accepted",
            rule_code="mintrud.old.rule",
            rule_version="old-version",
            requirement_reason=(
                "Existing Mintrud snapshot"
            ),
            readiness_errors=[],
        )

        session = FakeSession(
            course=course,
            existing_obligations=[
                existing_frdo,
                existing_mintrud,
            ],
        )

        obligations = (
            await ensure_registry_obligations_for_completed_enrollment(
                enrollment=enrollment,
                session=session,
                document=document,
            )
        )

        assert session.added == []

        assert (
            obligations["frdo"]
            is existing_frdo
        )
        assert (
            obligations["mintrud"]
            is existing_mintrud
        )

        assert (
            existing_frdo.status
            == "approved"
        )
        assert (
            existing_frdo.rule_code
            == "frdo.old.rule"
        )
        assert (
            existing_frdo.rule_version
            == "old-version"
        )

        assert (
            existing_mintrud.status
            == "accepted"
        )
        assert (
            existing_mintrud.rule_code
            == "mintrud.old.rule"
        )
        assert (
            existing_mintrud.rule_version
            == "old-version"
        )

        assert (
            existing_frdo.document_id
            == document.id
        )
        assert (
            existing_mintrud.document_id
            == document.id
        )

        assert session.flush_calls == 1
        assert session.commit_calls == 0

    asyncio.run(case())


def test_incomplete_enrollment_is_rejected() -> None:
    async def case():
        course = build_course(
            program_type="other"
        )
        enrollment = SimpleNamespace(
            id=str(uuid4()),
            user_id=str(uuid4()),
            course_id=course.id,
            status="active",
            started_at=datetime.now(
                timezone.utc
            ),
            completed_at=None,
        )
        session = FakeSession(
            course=course
        )

        with pytest.raises(
            ValueError,
            match=(
                "Registry obligations require "
                "completed enrollment"
            ),
        ):
            await ensure_registry_obligations_for_completed_enrollment(
                enrollment=enrollment,
                session=session,
            )

        assert session.added == []
        assert session.flush_calls == 0

    asyncio.run(case())


def test_mismatched_completion_document_is_rejected() -> None:
    async def case():
        course = build_course(
            program_type="other"
        )
        enrollment = (
            build_completed_enrollment(
                course.id
            )
        )
        document = build_document(
            str(uuid4())
        )
        session = FakeSession(
            course=course
        )

        with pytest.raises(
            ValueError,
            match=(
                "Completion document does not "
                "belong to enrollment"
            ),
        ):
            await ensure_registry_obligations_for_completed_enrollment(
                enrollment=enrollment,
                session=session,
                document=document,
            )

        assert session.added == []
        assert session.flush_calls == 0

    asyncio.run(case())


def test_missing_course_is_rejected() -> None:
    async def case():
        course = build_course(
            program_type="other"
        )
        enrollment = (
            build_completed_enrollment(
                course.id
            )
        )
        session = FakeSession(
            course=None
        )

        with pytest.raises(
            ValueError,
            match=(
                "Course for enrollment "
                "was not found"
            ),
        ):
            await ensure_registry_obligations_for_completed_enrollment(
                enrollment=enrollment,
                session=session,
            )

        assert session.added == []
        assert session.flush_calls == 0

    asyncio.run(case())
