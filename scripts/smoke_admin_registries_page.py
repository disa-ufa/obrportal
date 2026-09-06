from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

ROUTES = ROOT / "frontend/src/utils/adminRoutes.js"
SHELL = ROOT / "frontend/src/components/layout/AppShell.jsx"
RENDERER = ROOT / "frontend/src/routes/AdminPageRenderer.jsx"
PAGE = ROOT / "frontend/src/pages/AdminRegistriesPage.jsx"
CLIENT = ROOT / "frontend/src/api/client.js"


def require(condition, message):
    if not condition:
        raise AssertionError(message)


routes = ROUTES.read_text(encoding="utf-8")
shell = SHELL.read_text(encoding="utf-8")
renderer = RENDERER.read_text(encoding="utf-8")
page = PAGE.read_text(encoding="utf-8")
client = CLIENT.read_text(encoding="utf-8")


for marker in [
    'key: "registries"',
    'path: "/admin/registries"',
    '"documents", "registries"',
]:
    require(
        marker in routes,
        "route missing: " + marker,
    )


for marker in [
    '"registries"',
    "registries: Globe2",
]:
    require(
        marker in shell,
        "shell missing: " + marker,
    )


for marker in [
    "AdminRegistriesPage",
    'page === "registries"',
    'import("../pages/AdminRegistriesPage")',
]:
    require(
        marker in renderer,
        "renderer missing: " + marker,
    )


for marker in [
    "export function AdminRegistriesPage()",
    'data-testid="admin-registries-page"',
    'data-testid="admin-registries-tabs"',
    'data-testid="admin-registries-table"',
    'data-testid="admin-registries-attempts"',
    'data-testid="admin-registries-mintrud-context-form"',
    "getAdminFrdoObligations",
    "getAdminMintrudObligations",
    "validateAdminFrdoObligation",
    "validateAdminMintrudObligation",
    "approveAdminFrdoObligation",
    "approveAdminMintrudObligation",
    "updateAdminMintrudObligationContext",
    "getAdminFrdoSubmissionAttempts",
    "getAdminMintrudSubmissionAttempts",
    "downloadAdminFrdoSubmissionAttempt",
    "downloadAdminMintrudSubmissionAttempt",
    "markAdminFrdoSubmissionAttemptSubmitted",
    "markAdminMintrudSubmissionAttemptSubmitted",
    "recordAdminFrdoSubmissionAttemptResult",
    "recordAdminMintrudSubmissionAttemptResult",
]:
    require(
        marker in page,
        "page contract missing: " + marker,
    )


for name in [
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
]:
    require(
        (
            "export async function "
            + name
            + "("
        ) in client,
        "client API missing: " + name,
    )


for forbidden in [
    "createAdminFrdoSubmissionAttempt",
    "createAdminMintrudSubmissionAttempt",
    "generateAdminFrdo",
    "generateAdminMintrud",
    "exportAdminFrdoObligation",
    "exportAdminMintrudObligation",
]:
    require(
        forbidden not in page,
        "fake exporter action found: " + forbidden,
    )


print("ADMIN_REGISTRIES_ROUTE=PASS")
print("ADMIN_REGISTRIES_SHELL=PASS")
print("ADMIN_REGISTRIES_RENDERER=PASS")
print("ADMIN_REGISTRIES_PAGE=PASS")
print("ADMIN_REGISTRIES_NO_FAKE_EXPORTER=PASS")
print("SMOKE_ADMIN_REGISTRIES_PAGE=PASS")
