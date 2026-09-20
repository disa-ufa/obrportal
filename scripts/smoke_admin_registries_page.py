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
    'data-testid="admin-registry-submission-form"',
    'data-testid="admin-registry-result-form"',
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
    "ARTIFACT_KIND_LABELS",
    "internal-export-package",
    "portal-upload-artifact",
    "artifact_kind",
    "isPortalUploadArtifact",
    "isHistoricalInternalLifecycle",
    'data-testid="admin-registry-legacy-internal-lifecycle"',
    "artifactDownloadLabel",
    "MINTRUD_CONTEXT_TEXT",
    "MINTRUD_REPORTING_SCENARIO_LABELS",
    "MINTRUD_KNOWLEDGE_RESULT_LABELS",
    "getReadinessPresentation",
    'data-testid="admin-registry-readiness-state"',
    'data-testid="admin-registries-mintrud-external-employer"',
    'data-testid="admin-registries-mintrud-self-training-hint"',
    "mintrud.learn_program_missing",
    "mintrud.reporting_organization_name_missing",
    "mintrud.reporting_organization_inn_missing",
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


for removed_technical_ui in [
    '<option value="">reporting_scenario</option>',
    '<option value="external_training_provider">external_training_provider</option>',
    '<option value="employer_self_training">employer_self_training</option>',
    '<option value="">knowledge_check_result</option>',
    '<option value="satisfactory">satisfactory</option>',
    '<option value="unsatisfactory">unsatisfactory</option>',
    'placeholder="profession_or_position"',
    'placeholder="employer_name"',
    'placeholder="employer_inn"',
    'placeholder="protocol_number"',
    '{readiness || "OK"}',
]:
    require(
        removed_technical_ui not in page,
        "technical registry UI remains: "
        + removed_technical_ui,
    )


for forbidden_ui in [
    "window.prompt",
    "window.alert",
]:
    require(
        forbidden_ui not in page,
        "forbidden UI primitive found: " + forbidden_ui,
    )


require(
    r'exported: "\u0424\u0430\u0439\u043b \u0434\u043b\u044f \u043f\u043e\u0440\u0442\u0430\u043b\u0430 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043b\u0435\u043d"'
    in page,
    "exported status must describe portal artifact",
)

require(
    page.count(
        "isPortalUploadArtifact(attempt)"
    )
    >= 5,
    "portal artifact lifecycle gates missing",
)

require(
    'attempt.has_artifact && !attempt.submitted_at'
    not in page,
    "legacy broad submission gate remains",
)

require(
    'attempt.submitted_at && !attempt.result_status'
    not in page,
    "legacy broad result gate remains",
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
print("ADMIN_REGISTRIES_INLINE_ACTION_FORMS=PASS")
print("ADMIN_REGISTRIES_NO_FORBIDDEN_UI=PASS")
print("ADMIN_REGISTRIES_NO_FAKE_EXPORTER=PASS")
print("SMOKE_ADMIN_REGISTRIES_PAGE=PASS")
