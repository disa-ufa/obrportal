import ast
from pathlib import Path


AUTH_PATH = (
    Path(__file__).resolve().parents[2]
    / "app/api/v1/auth.py"
)

AUTH_SOURCE = AUTH_PATH.read_text(
    encoding="utf-8-sig"
)


def register_source() -> str:
    tree = ast.parse(AUTH_SOURCE)

    nodes = [
        node
        for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "register"
    ]

    assert len(nodes) == 1

    node = nodes[0]
    lines = AUTH_SOURCE.splitlines(
        keepends=True
    )

    return "".join(
        lines[
            node.lineno - 1:
            node.end_lineno
        ]
    )


def test_register_route_preserves_neutral_202_contract():
    source = register_source()

    assert (
        "PublicRegistrationAcceptedResponse"
        in source
    )

    assert (
        "PUBLIC_REGISTRATION_ACCEPTED_STATUS"
        in source
    )

    assert (
        "PUBLIC_REGISTRATION_ACCEPTED_MESSAGE"
        in source
    )


def test_register_rate_limit_does_not_expose_429_or_retry_after():
    source = register_source()

    assert "HTTP_429_TOO_MANY_REQUESTS" not in source
    assert '"Retry-After"' not in source


def test_register_rate_limit_writes_required_audit():
    source = register_source()

    assert (
        'action="public_registration.rate_limited"'
        in source
    )

    assert (
        '"flow": "registration"'
        in source
    )

    assert (
        "PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL"
        in source
    )

    assert (
        "PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_CLIENT"
        in source
    )

    audit_index = source.index(
        'action="public_registration.rate_limited"'
    )

    prepare_index = source.index(
        "_prepare_public_registration_transaction("
    )

    assert audit_index < prepare_index


def test_both_registration_limit_branches_return_neutral_response():
    source = register_source()

    assert "if not email_rate_limit.allowed:" in source
    assert "if not client_rate_limit.allowed:" in source

    # Existing normal flow already has two neutral returns:
    # one after an IntegrityError outcome and the final response.
    # Email and client rate-limit branches must add two more
    # early neutral returns.
    assert (
        source.count(
            "return PublicRegistrationAcceptedResponse("
        )
        >= 4
    )

    assert (
        source.count(
            "status=PUBLIC_REGISTRATION_ACCEPTED_STATUS"
        )
        >= 4
    )

    assert (
        source.count(
            "message=PUBLIC_REGISTRATION_ACCEPTED_MESSAGE"
        )
        >= 4
    )
