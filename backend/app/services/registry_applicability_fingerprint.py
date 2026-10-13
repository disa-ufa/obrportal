"""Canonical fingerprints of registry applicability inputs.

Pure utility. This DOES NOT resolve whether reporting is legally required,
write to the database, or activate approval/export gates. A future service
must build the input from authoritative database records inside the SAME
transaction as the guarded action and review the coverage of each field.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from hashlib import sha256
import json

from app.services.compliance_registry_contract import REGISTRY_CODES


INPUT_SCHEMA_VERSION = "registry-applicability-input-v1"


@dataclass(frozen=True)
class RegistryApplicabilityInputs:
    registry: str
    enrollment_id: str
    course_id: str
    regulatory_program_type: str
    requirement_mode: str
    rule_code: str
    rule_version: str
    course_document_type: str | None
    issued_document_type: str | None
    organization_id: str | None
    reporting_scenario: str | None
    effective_date: date | None
    mintrud_program_codes: tuple[str, ...]


def _required(value: str, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Missing or invalid applicability input: " + field)
    if value != value.strip():
        raise ValueError("Noncanonical applicability input: " + field)
    return value


def _optional(value: str | None, field: str) -> str | None:
    if value is None:
        return None
    return _required(value, field)


def canonical_applicability_inputs(data: RegistryApplicabilityInputs) -> str:
    """Stable UTF-8 JSON for inputs influencing registry applicability.

    Optional fields MUST be explicit (None) rather than silently omitted.
    Null values still need separate readiness/policy checks before any
    submission. Do not put learner identity or secrets into this snapshot.
    """
    if not isinstance(data, RegistryApplicabilityInputs):
        raise TypeError("Expected RegistryApplicabilityInputs")
    if data.registry not in REGISTRY_CODES:
        raise ValueError("Unsupported registry")

    for name in (
        "enrollment_id",
        "course_id",
        "regulatory_program_type",
        "requirement_mode",
        "rule_code",
        "rule_version",
    ):
        _required(getattr(data, name), name)

    for name in (
        "course_document_type",
        "issued_document_type",
        "organization_id",
        "reporting_scenario",
    ):
        _optional(getattr(data, name), name)

    if data.effective_date is not None and (
        not isinstance(data.effective_date, date)
        or data.effective_date.__class__.__name__ == "datetime"
    ):
        raise ValueError("effective_date must be a date or None")

    if not isinstance(data.mintrud_program_codes, tuple):
        raise ValueError("mintrud_program_codes must be a tuple")
    programs = tuple(
        sorted(_required(code, "mintrud_program_codes") for code in data.mintrud_program_codes)
    )
    if len(programs) != len(set(programs)):
        raise ValueError("Duplicate Mintrud program code")

    payload = {
        "schema_version": INPUT_SCHEMA_VERSION,
        "registry": data.registry,
        "enrollment_id": data.enrollment_id,
        "course_id": data.course_id,
        "regulatory_program_type": data.regulatory_program_type,
        "requirement_mode": data.requirement_mode,
        "rule": {"code": data.rule_code, "version": data.rule_version},
        "documents": {
            "course_type": data.course_document_type,
            "issued_type": data.issued_document_type,
        },
        "organization_id": data.organization_id,
        "reporting_scenario": data.reporting_scenario,
        "effective_date": (
            data.effective_date.isoformat() if data.effective_date else None
        ),
        "mintrud_program_codes": programs,
    }
    return json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def fingerprint_applicability_inputs(data: RegistryApplicabilityInputs) -> str:
    return sha256(
        canonical_applicability_inputs(data).encode("utf-8")
    ).hexdigest()
