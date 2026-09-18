from __future__ import annotations

import ast
from pathlib import Path


PRODUCTION_PATHS = (
    "app/api/v1/admin.py",
    (
        "app/services/"
        "compliance_registry_readiness_propagation.py"
    ),
)


def source(relative: str) -> str:
    return (
        Path(__file__)
        .resolve()
        .parents[2]
        .joinpath(relative)
        .read_text(
            encoding="utf-8"
        )
    )


def readiness_calls(
    relative: str,
) -> list[ast.Call]:
    tree = ast.parse(
        source(relative)
    )

    result = []

    for node in ast.walk(tree):
        if not isinstance(
            node,
            ast.Call,
        ):
            continue

        if not isinstance(
            node.func,
            ast.Name,
        ):
            continue

        if (
            node.func.id
            != "evaluate_registry_readiness"
        ):
            continue

        result.append(node)

    return result


def keyword(
    call: ast.Call,
    name: str,
):
    for item in call.keywords:
        if item.arg == name:
            return item.value

    return None


def registry_name(
    call: ast.Call,
):
    value = keyword(
        call,
        "registry",
    )

    if isinstance(
        value,
        ast.Name,
    ):
        return value.id

    return None


def test_all_production_mintrud_calls_load_active_programs():
    calls = []

    for relative in PRODUCTION_PATHS:
        for call in readiness_calls(
            relative
        ):
            if (
                registry_name(call)
                == "REGISTRY_MINTRUD"
            ):
                calls.append(
                    (
                        relative,
                        call,
                    )
                )

    assert len(calls) == 4

    for relative, call in calls:
        value = keyword(
            call,
            "mintrud_learn_programs",
        )

        assert value is not None, relative

        rendered = ast.unparse(
            value
        )

        assert (
            "load_course_mintrud_learn_programs"
            in rendered
        ), relative

        assert (
            "active_only=True"
            in rendered
        ), relative


def test_expected_production_call_counts():
    mintrud = 0
    frdo = 0

    for relative in PRODUCTION_PATHS:
        for call in readiness_calls(
            relative
        ):
            registry = registry_name(
                call
            )

            if registry == "REGISTRY_MINTRUD":
                mintrud += 1

            if registry == "REGISTRY_FRDO":
                frdo += 1

    assert mintrud == 4
    assert frdo == 3


def test_frdo_calls_do_not_require_mintrud_programs():
    for relative in PRODUCTION_PATHS:
        for call in readiness_calls(
            relative
        ):
            if (
                registry_name(call)
                != "REGISTRY_FRDO"
            ):
                continue

            assert (
                keyword(
                    call,
                    "mintrud_learn_programs",
                )
                is None
            )
