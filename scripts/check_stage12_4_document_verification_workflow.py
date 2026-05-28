from pathlib import Path

DOC = Path("docs/stage-12-4-document-verification-workflow.md")
VERIFY_PAGE = Path("frontend/src/pages/VerifyDocumentPage.jsx")
ACCOUNT_PAGE = Path("frontend/src/pages/AccountPage.jsx")
DOCUMENTS_PAGE = Path("frontend/src/pages/DocumentsPage.jsx")
API_CLIENT = Path("frontend/src/api/client.js")
APP = Path("frontend/src/App.jsx")
PUBLIC_ROUTES = Path("frontend/src/routes/PublicRoutes.jsx")
PUBLIC_ROUTE_COMPONENTS = Path("frontend/src/routes/PublicRouteComponents.jsx")

REQUIRED_FILES = [
    DOC,
    VERIFY_PAGE,
    ACCOUNT_PAGE,
    DOCUMENTS_PAGE,
    API_CLIENT,
    APP,
    PUBLIC_ROUTES,
    PUBLIC_ROUTE_COMPONENTS,
]

DOC_MARKERS = [
    "# Stage 12.4. Document verification workflow",
    "Status: in progress",
    "no database migrations",
    "no API contract changes unless a separate backend test is added first",
    "no authentication or RBAC weakening",
    "public verification must not expose private learner data beyond intended fields",
    "invalid verification codes must be handled safely",
    "revoked documents must remain visibly invalid",
    "draft documents must not be treated as valid public documents",
    "frontend_runtime_changed=no",
    "backend_runtime_changed=no",
    "current git head before Stage 12.4 implementation: 006e160",
    "tag v0.1.0-stage12-1-account-ux-polish exists",
    "tag v0.1.0-stage12-2-catalog-ux-polish exists",
    "tag v0.1.0-stage12-3-course-detail-ux-polish exists",
    "public /verify-document route exists",
    "public /verify/:code route exists",
    "VerifyDocumentPage exists",
    "VerifyDocumentCodeRoute exists",
    "frontend API client exposes verifyPublicDocument",
    "GET /api/v1/public/documents/verify?number=...",
    "GET /api/v1/account/documents",
    "GET /api/v1/account/documents/{document_id}/download",
    "Stage 12.4 document verification workflow guard created",
    "/opt/obrportal/tmp/stage_12_4_1_document_verification_workflow_docs_sync_20260527210622.txt",
    "stage12_4_document_verification_workflow_docs_sync=passed",
    "route marker VerifyDocumentCodeRoute was present",
    "route marker /verify-document was present",
    "route marker /verify/:code was present",
    "account marker CompletionDocumentsDiagnostics was present",
    "account marker canShowPublicDocumentVerification was present",
    "account marker DocumentVerificationQrBlock was present",
    "API marker /api/v1/public/documents/verify was present",
    "source marker setResult was present",
    "source marker setError was present",
    "source marker setLoading was present",
    "source marker verifyPublicDocument was present",
    "source marker VerifyDocumentPage was present",
    "Stage 12.3 course detail UX polish tag head verified: 5f88a8c",
    "Stage 12.3 course detail learner workflow guard passed",
    "Stage 12.4 document verification workflow guard passed",
    "production git head: 8131e18",
    "Stage 12.4 document verification workflow docs sync - 2026-05-27",
    "no backend runtime changes",
    "no API changes",
    "frontend-only change",
    "Stage 12.4 adds a frontend-only public verification journey hint",
    "Stage 12.4 public verification journey hint - 2026-05-28",
    "/opt/obrportal/tmp/stage_12_4_3_public_verification_journey_frontend_deploy_20260527212724.txt",
    "stage12_4_public_verification_journey_frontend_deploy=passed",
    "frontend_runtime_changed=yes",
    "public /verify/DOCV-SMOKE returned HTTP 200",
    "public /verify-document returned HTTP 200",
    "frontend health became healthy",
    "frontend container was recreated",
    "frontend static image was rebuilt",
    "source marker ResultCard remained rendered",
    "source marker PublicVerificationQrOperationsPanel remained rendered",
    "source marker PublicVerificationDiagnostics remained rendered",
    "source marker verifyPublicDocument(value) was unchanged",
    "source marker public-verification-journey-catalog-action was present",
    "source marker public-verification-journey-account-action was present",
    "source marker public-verification-journey-safe-data was present",
    "source marker public-verification-journey-current-state was present",
    "source marker public-verification-journey-steps was present",
    "source marker public-verification-journey-title was present",
    "source marker public-verification-journey was present",
    "source marker PublicVerificationJourneyHint render was present",
    "source marker PublicVerificationJourneyHint was present",
    "production git head: b9c18bf",
    "Stage 12.4 public verification journey frontend deploy - 2026-05-27",
    "existing verifyPublicDocument(value) API call remains unchanged",
    "Stage 12.4 adds stable frontend markers for the public verification form",
    "Stage 12.4 public verification form and service states - 2026-05-28",
    "/opt/obrportal/tmp/stage_12_4_5_public_verification_service_states_frontend_deploy_20260527215246.txt",
    "stage12_4_public_verification_service_states_frontend_deploy=passed",
    "source marker PublicVerificationJourneyHint remained rendered",
    "source marker public-verification-result-catalog-action was present",
    "source marker public-verification-result-card was present",
    "source marker not found aria live polite was present",
    "source marker not found status role was present",
    "source marker public-verification-not-found-state was present",
    "source marker error aria live assertive was present",
    "source marker error alert role was present",
    "source marker public-verification-error-state was present",
    "source marker submit disabled guard was present",
    "source marker public-verification-submit was present",
    "source marker public-verification-query-input was present",
    "source marker public-verification-form was present",
    "source marker public-verification-form-section was present",
    "source marker verifyPublicDocument value call was unchanged",
    "production git head: 31a0eae",
    "Stage 12.4 public verification service states frontend deploy - 2026-05-27",
]

VERIFY_PAGE_MARKERS = [
    "VerifyDocumentPage",
    "verifyPublicDocument",
    "useState",
    "loading",
    "error",
    "result",
    "onPageChange",
    "setResult",
    "setError",
    "setLoading",
    "<PublicVerificationJourneyHint",
    "Публичная проверка не открывает файл документа",
    "Проверка документа → код/номер → результат",
    "public-verification-journey-catalog-action",
    "public-verification-journey-account-action",
    "public-verification-journey-safe-data",
    "public-verification-journey-current-state",
    "public-verification-journey-steps",
    "public-verification-journey-title",
    "public-verification-journey",
    "PublicVerificationJourneyHint",
    "verifyPublicDocument(value)",
    'aria-live="polite"',
    'aria-live="assertive"',
    'role="status"',
    'role="alert"',
    "public-verification-not-found-contacts-action",
    "public-verification-not-found-reset-action",
    "public-verification-result-home-action",
    "public-verification-result-catalog-action",
    "public-verification-result-reset-action",
    "public-verification-result-card",
    "public-verification-not-found-state",
    "public-verification-error-state",
    "disabled={loading || !normalizedQuery}",
    "public-verification-submit",
    "public-verification-query-input",
    "public-verification-form",
    "public-verification-form-section",
]

ACCOUNT_MARKERS = [
    "getAccountDocuments",
    "downloadAccountDocument",
    "DocumentVerificationQrBlock",
    "hasDocumentVerificationTarget",
    "canShowPublicDocumentVerification",
    "getAccountDocumentNotice",
    "getAccountDocumentDownloadLabel",
    "canDownloadDocument",
    "CompletionDocumentsDiagnostics",
    "account-completion-documents-diagnostics",
    "account-completion-documents-summary",
    "account-completion-documents-quality",
    "account-completion-documents-attention",
    "account-completion-documents-links",
    "account-documents",
    "Публичная проверка",
    "QR/проверка",
]

DOCUMENTS_PAGE_MARKERS = [
    "DocumentsPage",
    "DOCUMENT_STATUSES",
    "document_number",
    "verification_code",
    "revocation_reason",
    "document-missing-file-action-hint",
    "admin-document-edit-file",
    "Заменить файл",
]

API_MARKERS = [
    "verifyPublicDocument",
    "/api/v1/public/documents/verify",
    "getAccountDocuments",
    "/api/v1/account/documents",
    "downloadAccountDocument",
    "/api/v1/account/documents/${documentId}/download",
    "getAdminDocuments",
    "/api/v1/admin/documents",
]

ROUTE_MARKERS = [
    "VerifyDocumentPage",
    "VerifyDocumentCodeRoute",
    'path="/verify/:code"',
    'path="/verify-document"',
    "handleNavigatePublicPage",
    "onPageChange",
]

def read(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")
    return path.read_text(encoding="utf-8")

def require_markers(name: str, text: str, markers: list[str]) -> None:
    missing = [marker for marker in markers if marker not in text]
    if missing:
        print(f"{name}: missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

def main() -> None:
    for path in REQUIRED_FILES:
        if not path.exists():
            raise SystemExit(f"Missing required file: {path}")

    doc_text = read(DOC)
    verify_page_text = read(VERIFY_PAGE)
    account_text = read(ACCOUNT_PAGE)
    documents_text = read(DOCUMENTS_PAGE)
    api_text = read(API_CLIENT)
    route_text = read(APP) + "\n" + read(PUBLIC_ROUTES) + "\n" + read(PUBLIC_ROUTE_COMPONENTS)

    require_markers("doc", doc_text, DOC_MARKERS)
    require_markers("verify_page", verify_page_text, VERIFY_PAGE_MARKERS)
    require_markers("account_page", account_text, ACCOUNT_MARKERS)
    require_markers("documents_page", documents_text, DOCUMENTS_PAGE_MARKERS)
    require_markers("api_client", api_text, API_MARKERS)
    require_markers("routes", route_text, ROUTE_MARKERS)

    sections = doc_text.count("\n## ")
    safety_markers = sum(1 for marker in [
        "no database migrations",
        "no API contract changes",
        "no authentication or RBAC weakening",
        "no secrets",
        "public verification must not expose private learner data",
        "invalid verification codes must be handled safely",
        "revoked documents must remain visibly invalid",
        "draft documents must not be treated as valid public documents",
        "frontend_runtime_changed",
        "backend_runtime_changed",
    ] if marker in doc_text)

    state_markers = sum(1 for marker in [
        "visitor opens /verify-document manually",
        "visitor opens /verify/:code from QR link",
        "visitor enters empty verification value",
        "visitor enters invalid verification value",
        "visitor enters valid document number",
        "visitor enters valid verification code",
        "verification request is loading",
        "verification request fails",
        "verified document is available",
        "verified document is revoked",
        "verified document is draft or not publicly valid",
        "learner sees available documents in account",
        "learner sees draft documents in account",
        "learner sees revoked documents in account",
        "learner has no documents yet",
    ] if marker in doc_text)

    total_markers = (
        len(DOC_MARKERS)
        + len(VERIFY_PAGE_MARKERS)
        + len(ACCOUNT_MARKERS)
        + len(DOCUMENTS_PAGE_MARKERS)
        + len(API_MARKERS)
        + len(ROUTE_MARKERS)
    )

    print(
        "stage 12.4 document verification workflow diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"state_markers={state_markers}, markers={total_markers}"
    )

if __name__ == "__main__":
    main()
