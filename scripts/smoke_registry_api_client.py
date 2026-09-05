from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

CLIENT = (
    ROOT
    / "frontend"
    / "src"
    / "api"
    / "client.js"
)


def require(
    condition: bool,
    message: str,
) -> None:
    if not condition:
        raise AssertionError(
            message
        )


source = CLIENT.read_text(
    encoding="utf-8"
)


FUNCTIONS = [
    "getAdminFrdoObligations",
    "validateAdminFrdoObligation",
    "approveAdminFrdoObligation",
    "getAdminFrdoSubmissionAttempts",
    "downloadAdminFrdoSubmissionAttempt",
    "markAdminFrdoSubmissionAttemptSubmitted",
    "recordAdminFrdoSubmissionAttemptResult",
    "getAdminMintrudObligations",
    "validateAdminMintrudObligation",
    "updateAdminMintrudObligationContext",
    "approveAdminMintrudObligation",
    "getAdminMintrudSubmissionAttempts",
    "downloadAdminMintrudSubmissionAttempt",
    "markAdminMintrudSubmissionAttemptSubmitted",
    "recordAdminMintrudSubmissionAttemptResult",
]


for name in FUNCTIONS:
    marker = (
        "export async function "
        + name
        + "("
    )

    require(
        source.count(
            marker
        )
        == 1,
        (
            "registry client function "
            "missing or duplicated: "
            + name
        ),
    )


for key in [
    '"user_id"',
    '"course_id"',
    '"status"',
    '"q"',
    '"limit"',
]:
    require(
        key
        in source,
        (
            "registry query key missing: "
            + key
        ),
    )


ROUTE_FRAGMENTS = [
    "/api/v1/admin/frdo/obligations/${obligationId}/validate",
    "/api/v1/admin/frdo/obligations/${obligationId}/approve",
    "/api/v1/admin/frdo/obligations/${obligationId}/attempts",
    "/api/v1/admin/mintrud/obligations/${obligationId}/validate",
    "/api/v1/admin/mintrud/obligations/${obligationId}/context",
    "/api/v1/admin/mintrud/obligations/${obligationId}/approve",
    "/api/v1/admin/mintrud/obligations/${obligationId}/attempts",
    "/attempts/${attemptId}/submitted",
    "/attempts/${attemptId}/result",
    "/attempts/${attemptId}/download",
]


for route in ROUTE_FRAGMENTS:
    require(
        route
        in source,
        (
            "registry route fragment "
            "missing: "
            + route
        ),
    )


require(
    source.count(
        'method: "PATCH"'
    )
    >= 1,
    "Mintrud context PATCH missing",
)

require(
    source.count(
        "body: JSON.stringify(payload)"
    )
    >= 5,
    "registry JSON payload encoding missing",
)

require(
    (
        "downloadAdminRegistrySubmissionAttempt"
        in source
    ),
    "registry download helper missing",
)

require(
    (
        '"Accept": '
        '"application/xml, text/xml, '
        'application/octet-stream"'
    )
    in source,
    "registry download Accept missing",
)

require(
    "extractDownloadFilename("
    in source,
    "download filename parser not reused",
)

require(
    "normalizeDownloadedFilename("
    in source,
    "download filename normalizer not reused",
)

require(
    "window.URL.createObjectURL"
    in source,
    "blob download primitive missing",
)

require(
    "window.URL.revokeObjectURL"
    in source,
    "blob URL cleanup missing",
)


FORBIDDEN = [
    "createAdminFrdoSubmissionAttempt",
    "createAdminMintrudSubmissionAttempt",
    "generateAdminFrdo",
    "generateAdminMintrud",
    "exportAdminFrdoObligation",
    "exportAdminMintrudObligation",
]


for marker in FORBIDDEN:
    require(
        marker
        not in source,
        (
            "forbidden fake exporter "
            "client action found: "
            + marker
        ),
    )


print(
    "REGISTRY_CLIENT_EXPORT_COUNT="
    + str(
        len(
            FUNCTIONS
        )
    )
)

print(
    "REGISTRY_CLIENT_ROUTES=PASS"
)

print(
    "REGISTRY_CLIENT_DOWNLOAD=PASS"
)

print(
    "REGISTRY_CLIENT_NO_FAKE_EXPORTER=PASS"
)

print(
    "SMOKE_REGISTRY_API_CLIENT=PASS"
)
