"""Fail-closed contract tests for the dormant fingerprint diagnostic."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services.registry_applicability_export_guard import RegistryApplicabilityGateError
from app.services.registry_current_fingerprint_preflight import (
    preflight_current_registry_fingerprint,
)


@pytest.mark.asyncio
async def test_current_fingerprint_preflight_returns_diagnostic_only():
    obligation = SimpleNamespace(id="obligation-1")
    current = SimpleNamespace(
        fingerprint="a" * 64,
        evaluation=SimpleNamespace(status="required"),
    )
    scope = SimpleNamespace(targets=(object(),))
    grant = SimpleNamespace(decision_version=2)
    with (
        patch(
            "app.services.registry_current_fingerprint_preflight.acquire_discovered_registry_action_scope",
            new_callable=AsyncMock, return_value=((obligation,), scope),
        ),
        patch(
            "app.services.registry_current_fingerprint_preflight.load_current_registry_applicability_inputs",
            new_callable=AsyncMock, return_value=current,
        ),
        patch(
            "app.services.registry_current_fingerprint_preflight.require_registry_applicability_for_submission",
            new_callable=AsyncMock, return_value=grant,
        ) as gate,
    ):
        evidence = await preflight_current_registry_fingerprint(
            session=object(), actor_id="actor", registry="frdo",
            obligation_id="obligation-1",
        )
    assert evidence.current_fingerprint == "a" * 64
    assert evidence.decision_version == 2
    gate.assert_awaited_once()
    assert gate.await_args.kwargs["expected_input_fingerprint"] == "a" * 64


@pytest.mark.asyncio
@pytest.mark.parametrize("status", ["needs_review", "not_required"])
async def test_current_rule_disagreement_fails_closed(status):
    current = SimpleNamespace(
        fingerprint="b" * 64,
        evaluation=SimpleNamespace(status=status),
    )
    with (
        patch(
            "app.services.registry_current_fingerprint_preflight.acquire_discovered_registry_action_scope",
            new_callable=AsyncMock,
            return_value=((SimpleNamespace(id="one"),), SimpleNamespace(targets=(object(),))),
        ),
        patch(
            "app.services.registry_current_fingerprint_preflight.load_current_registry_applicability_inputs",
            new_callable=AsyncMock, return_value=current,
        ),
        patch(
            "app.services.registry_current_fingerprint_preflight.require_registry_applicability_for_submission",
            new_callable=AsyncMock, return_value=SimpleNamespace(decision_version=1),
        ),
    ):
        with pytest.raises(
            RegistryApplicabilityGateError,
            match="registry.current_rule_not_required",
        ):
            await preflight_current_registry_fingerprint(
                session=object(), actor_id="actor", registry="frdo",
                obligation_id="one",
            )
