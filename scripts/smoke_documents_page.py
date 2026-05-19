from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def require_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"{relative_path} is missing required fragments:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)


def require_not_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    found = [fragment for fragment in fragments if fragment in text]

    if found:
        print(f"{relative_path} contains forbidden fragments:")
        for fragment in found:
            print(f" - {fragment}")
        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/api/client.js",
        [
            "export async function getAccountDocuments()",
            'return request("/api/v1/account/documents");',
            "export async function downloadAccountDocument(documentId)",
            "export async function verifyPublicDocument(number)",
            'return request(`/api/v1/public/documents/verify?${query.toString()}`);',
            "export async function getAdminDocuments(filters = {})",
            'return request(`/api/v1/admin/documents${query ? `?${query}` : \"\"}`);',
            "export async function createAdminDocument(payload)",
            'return request("/api/v1/admin/documents",',
            "export async function updateAdminDocument(documentId, payload)",
            "export async function regenerateAdminDocument(documentId)",
            "return request(`/api/v1/admin/documents/${documentId}/regenerate`",
            "export async function deleteAdminDocument(documentId)",
            "export async function downloadAdminDocument(documentId)",
            "extractDownloadFilename(response,",
            "normalizeDownloadedFilename(",
        ],
    )

    require_contains(
        "frontend/src/pages/DocumentsPage.jsx",
        [
            'import { useEffect, useMemo, useState } from "react";',
            "createAdminDocument,",
            "deleteAdminDocument,",
            "downloadAdminDocument,",
            "getAdminCourses,",
            "getAdminDocuments,",
            "getAdminWorklistSummary,",
            "getAdminEnrollments,",
            "getAdminUsers,",
            "updateAdminDocument,",
            "regenerateAdminDocument,",
            "DocumentVerificationQrBlock",
            "buildDocumentVerificationPath",
            "buildDocumentsPath",
            "export function DocumentsPage()",
            "const DOCUMENT_STATUSES = [",
            "const DOCUMENT_API_ERROR_MESSAGES = {",
            "function getDocumentStatusLabel(status)",
            "function formatDocumentApiError(err, fallback)",
            "function getDocumentStatusTone(status)",
            "function getLearnerVisibilityLabel(documentItem)",
            "function getLearnerVisibilityTone(documentItem)",
            "function isGeneratedCompletionDocument(documentItem)",
            "function canPublishGeneratedCompletionDocument(documentItem)",
            "function getAdminDocumentDownloadLabel(documentItem)",
            "function getGeneratedCompletionNotice(documentItem)",
            "function getDocumentFiltersFromSearch(search)",
            "function buildEditForm(documentItem)",
            "function DocumentsSummaryCards(",
            "function DocumentsWorkflowPanel(",
            "const [documents, setDocuments] = useState([]);",
            "const [documentStatusCounts, setDocumentStatusCounts] = useState({",
            "const [documentActionRequiredCount, setDocumentActionRequiredCount] = useState(0);",
            "const [filterActionRequired, setFilterActionRequired] = useState(initialFilters.action_required);",
            "const showActionRequiredOnly = filterActionRequired === \"true\";",
            "const activeFilters = { limit: 300, ...filters };",
            "getAdminDocuments(activeFilters)",
            "getAdminWorklistSummary({",
            "setDocumentActionRequiredCount(documentsSummary.action_required || 0);",
            "handleToggleActionRequiredFilter",
            "documentActionRequiredCount",
            "Требуют действия: {documentActionRequiredCount}",
            "const [users, setUsers] = useState([]);",
            "const [courses, setCourses] = useState([]);",
            "const [enrollments, setEnrollments] = useState([]);",
            "const [filterUserId, setFilterUserId] = useState(",
            "const [filterEnrollmentId, setFilterEnrollmentId] = useState(",
            "const [filterStatus, setFilterStatus] = useState(",
            "const [filterDocumentType, setFilterDocumentType] = useState(",
            "const [filterQuery, setFilterQuery] = useState(",
            "async function loadData(nextFilters = null)",
            "getAdminUsers()",
            "getAdminCourses({ limit: 300 })",
            "getAdminEnrollments({ limit: 300 })",
            "async function handleSubmit(event)",
            "createAdminDocument(payload)",
            "function handleStartEdit(documentItem)",
            "async function handleEditSubmit(event, documentId)",
            "updateAdminDocument(documentId, payload)",
            "async function handleQuickStatusUpdate(documentItem, nextStatus, revocationReasonOverride = null)",
            "updateAdminDocument(documentItem.id, payload)",
            "async function handleAdminDownload(documentItem)",
            "downloadAdminDocument(documentItem.id)",
            "async function handleRegenerateCompletionDocument(documentItem)",
            "regenerateAdminDocument(documentItem.id)",
            "setRegenerateSavingId(documentItem.id);",
            "document-regenerate-pdf-action",
            "Пересобрать PDF",
            "async function handleDelete(documentItem)",
            "deleteAdminDocument(documentItem.id)",
            "async function handleApplyFilter(event)",
            "async function handleQuickStatusFilter(nextStatus)",
            "async function handleClearEnrollmentFilter()",
            "async function handleResetFilter()",
            "<DocumentsSummaryCards",
            "<DocumentsWorkflowPanel",
            "<DocumentVerificationQrBlock",
            "documentItem.status === \"available\" ? (",
            "data-testid=\"document-state-panel\"",
            r"\u0421\u0442\u0430\u0442\u0443\u0441",
            r"\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c",
            r"\u0424\u0430\u0439\u043b / PDF",
            r"\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 PDF \u0441\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d",
            r"\u0424\u0430\u0439\u043b \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d",
            r"\u0424\u0430\u0439\u043b \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d",
            r"\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u0430",
            r"\u0421\u043a\u0440\u044b\u0442\u0430: \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d",
            r"\u0421\u043a\u0440\u044b\u0442\u0430 \u0434\u043e \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438",
            "getDocumentStatusLabel(documentItem.status)",
            "getLearnerVisibilityLabel(documentItem)",
            "isDocumentActionRequired(documentItem)",
            "showActionRequiredOnly",
            "handleClearActionRequiredFilter",
            "showActionRequiredOnly ? handleClearActionRequiredFilter : handleResetFilter",
            r"\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b, \u0442\u0440\u0435\u0431\u0443\u044e\u0449\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f, \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b",
            r"\u0412\u0441\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u0432 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0432\u044b\u0431\u043e\u0440\u043a\u0435 \u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u044e\u0442 \u0441\u0440\u043e\u0447\u043d\u043e\u0433\u043e \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f.",
            r"\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
            "displayedDocuments",
            "\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432: {displayedDocuments.length}",
            "data-testid=\"documents-action-required-filter\"",
            r"\u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
            "showMissingFileActionHint",
            "data-testid=\"document-missing-file-action-hint\"",
            r"\u041f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430: \u0444\u0430\u0439\u043b \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d",
            r"\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
            r"\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u0430\u0439\u043b \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
            "data-testid=\"document-verification-hidden-note\"",
            "showPublicLink",
            "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0441\u043a\u0440\u044b\u0442\u0430: \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d",
            "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0441\u043a\u0440\u044b\u0442\u0430 \u0434\u043e \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438",
            "QR-\u043a\u043e\u0434 \u0438 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u0441\u0441\u044b\u043b\u043a\u0430 \u043d\u0435 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u0434\u043b\u044f \u043e\u0442\u043e\u0437\u0432\u0430\u043d\u043d\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.",
            "QR-\u043a\u043e\u0434 \u0438 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u0441\u0441\u044b\u043b\u043a\u0430 \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0432 \u0441\u0442\u0430\u0442\u0443\u0441 \u00ab\u0414\u043e\u0441\u0442\u0443\u043f\u0435\u043d\u00bb.",
            "handleQuickStatusUpdate(documentItem, \"available\")",
            "handleQuickStatusUpdate(documentItem, \"draft\")",
            "handleStartRevoke(documentItem)",
            "const [revokingDocumentId, setRevokingDocumentId] = useState(\"\");",
            "const [revocationReason, setRevocationReason] = useState(\"\");",
            "function handleStartRevoke(documentItem)",
            "function handleCancelRevoke()",
            "async function handleConfirmRevoke(documentItem)",
            "setRevokingDocumentId(documentItem.id);",
            "setRevocationReason(documentItem.revocation_reason || \"\");",
            "handleQuickStatusUpdate(documentItem, \"revoked\", revocationReason)",
            "const isRevokingFormOpen = revokingDocumentId === documentItem.id;",
            "{isRevokingFormOpen && (",
            "\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u043e\u0442\u0437\u044b\u0432\u0430",
            "\u041a\u0440\u0430\u0442\u043a\u043e \u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u0443 \u043e\u0442\u0437\u044b\u0432\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
            "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u043e\u0442\u0437\u044b\u0432",
            "\u041e\u0442\u043c\u0435\u043d\u0430",
        ],
    )

    require_not_contains(
        "frontend/src/pages/DocumentsPage.jsx",
        [
            "window.prompt(",
            "window.alert(",
            "handleQuickStatusUpdate(documentItem, \"revoked\")",
            "showPublicLink={documentItem.status === \"available\"}",
            "\u041a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0443\u0436\u0435 \u0437\u0430\u043a\u0440\u0435\u043f\u043b\u0451\u043d \u0437\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u043c. \u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u0441\u043b\u0435 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438.",
        ],
    )

    require_contains(
        "frontend/src/pages/VerifyDocumentPage.jsx",
        [
            'import { useEffect, useMemo, useState } from "react";',
            "verifyPublicDocument",
            "DocumentVerificationQrBlock",
            "export function VerifyDocumentPage",
            "const [query, setQuery] = useState(\"\");",
            "const [result, setResult] = useState(null);",
            "const [submittedQuery, setSubmittedQuery] = useState(\"\");",
            "const [loading, setLoading] = useState(false);",
            "const [error, setError] = useState(\"\");",
            "const [notFound, setNotFound] = useState(false);",
            "async function runVerification(rawValue, options = {})",
            "verifyPublicDocument(value)",
            "url.searchParams.set(\"number\", value);",
            "params.get(\"number\")",
            "params.get(\"code\")",
            "async function handleSubmit(event)",
            "function getRegistryStatusLabel(status)",
            "function getVerificationTone(result)",
            "<DocumentVerificationQrBlock",
            "code={result.verification_code}",
            "documentNumber={result.document_number}",
            "containerId=\"public-document-verification-qr\"",
        ],
    )

    require_contains(
        "frontend/src/components/documents/DocumentVerificationQrBlock.jsx",
        [
            "export function DocumentVerificationQrBlock",
            "QRCodeSVG",
            "buildDocumentVerificationPath",
            "showPublicLink",
            "showCopyLink",
            "showUrl",
        ],
    )

    require_contains(
        "frontend/src/utils/documentVerification.js",
        [
            "export function buildDocumentVerificationPath",
            "encodeURIComponent",
        ],
    )

    print("Documents page behavior smoke passed")


if __name__ == "__main__":
    main()
