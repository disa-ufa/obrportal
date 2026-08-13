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


def main() -> None:
    require_contains(
        "frontend/src/api/client.js",
        [
            "export async function getAccountSummary()",
            'return request("/api/v1/account/summary");',
            "export async function getAccountCourses()",
            'return request("/api/v1/account/courses");',
            "export async function enrollAccountCourse(courseId)",
            "/api/v1/account/courses/${courseId}/enroll",
            "export async function startAccountCourse(enrollmentId)",
            "/api/v1/account/courses/${enrollmentId}/start",
            "export async function completeAccountCourse(enrollmentId)",
            "/api/v1/account/courses/${enrollmentId}/complete",
            "export async function getAccountDocuments()",
            'return request("/api/v1/account/documents");',
            "export async function downloadAccountDocument(documentId)",
            "/api/v1/account/documents/${documentId}/download",
            "extractDownloadFilename(response,",
            "normalizeDownloadedFilename(",
        ],
    )

    require_contains(
        "frontend/src/pages/AccountPage.jsx",
        [
            'import { useEffect, useMemo, useState } from "react";',
            "completeAccountCourse,",
            "downloadAccountDocument,",
            "getAccountCourses,",
            "getAccountDocuments,",
            "getAccountSummary,",
            "startAccountCourse,",
            "DocumentVerificationQrBlock",
            "AdminQuickFilterButtons",
            'import { AccountLearnerProfileCard } from "../components/account/AccountLearnerProfileCard";',
            "SectionCard",
            "export function AccountPage",
            "function getStatusLabel(status)",
            "function getStatusTone(status)",
            "const ACCOUNT_COURSE_FILTERS = [",
            "const ACCOUNT_DOCUMENT_FILTERS = [",
            "function calculateStatusCounts(items, getStatus)",
            "function getDocumentStatusLabel(status)",
            "function getDocumentStatusTone(status)",
            "function hasDocumentVerificationTarget(documentItem)",
            "function canShowPublicDocumentVerification(documentItem)",
            "function getAccountDocumentNotice(documentItem)",
            "function isGeneratedPdfDocument(documentItem)",
            "function getAccountDocumentDownloadLabel(documentItem)",
            "function canDownloadDocument(documentItem)",
            "const [summary, setSummary] = useState(null);",
            "const [coursesResponse, setCoursesResponse] = useState(null);",
            "const [documentsResponse, setDocumentsResponse] = useState(null);",
            "const [downloadError, setDownloadError] = useState(\"\");",
            "const [downloadLoadingId, setDownloadLoadingId] = useState(\"\");",
            "const [courseActionError, setCourseActionError] = useState(\"\");",
            "const [courseActionLoadingKey, setCourseActionLoadingKey] = useState(\"\");",
            "const [courseStatusFilter, setCourseStatusFilter] = useState(\"\");",
            "const [documentStatusFilter, setDocumentStatusFilter] = useState(\"\");",
            "async function loadAccountData()",
            "getAccountSummary()",
            "getAccountCourses()",
            "getAccountDocuments()",
            "async function refreshAccountSnapshot()",
            "async function handleStartCourse(enrollmentId)",
            "startAccountCourse(enrollmentId)",
            "async function handleCompleteCourse(enrollmentId)",
            "completeAccountCourse(enrollmentId)",
            "async function handleDownload(documentId)",
            "downloadAccountDocument(documentId)",
            "const courses = coursesResponse?.items || [];",
            "const documents = documentsResponse?.items || [];",
            "const courseStatusCounts = useMemo(",
            "const documentStatusCounts = useMemo(",
            "const visibleCourses = useMemo(",
            "const visibleDocuments = useMemo(",
            "items={ACCOUNT_DOCUMENT_FILTERS}",
            "activeValue={documentStatusFilter}",
            "counts={documentStatusCounts}",
            "onChange={setDocumentStatusFilter}",
            "handleStartCourse(course.enrollment_id)",
            "handleCompleteCourse(course.enrollment_id)",
            "<DocumentVerificationQrBlock",
            "code={documentItem.verification_code}",
            "documentNumber={documentItem.document_number}",
            "containerId={`account-document-qr-${documentItem.id}`}",
            "handleDownload(documentItem.id)",
        ],
    )

    require_contains(
        "frontend/src/components/account/AccountLearnerProfileCard.jsx",
        [
            "getAccountLearnerProfile,",
            "updateAccountLearnerProfile,",
            "const EMPTY_FORM = {",
            "function toFormData(profile)",
            "function buildPayload(formData, profile)",
            "function formatProfileSaveError(error)",
            (
                "export function "
                "AccountLearnerProfileCard({ accountUser })"
            ),
            "getAccountLearnerProfile()",
            "updateAccountLearnerProfile(",
            'data-testid="account-learner-profile"',
            (
                'data-testid='
                '"account-learner-profile-loading"'
            ),
            (
                'data-testid='
                '"account-learner-profile-unavailable"'
            ),
            (
                'title="\u041f\u0435\u0440\u0441\u043e\u043d\u0430\u043b'
                '\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b'
                '\u0435 \u0434\u043b\u044f \u0434\u043e\u043a\u0443\u043c'
                '\u0435\u043d\u0442\u043e\u0432"'
            ),
            (
                "\u0423\u0447\u0451\u0442\u043d\u0430\u044f "
                "\u0437\u0430\u043f\u0438\u0441\u044c \u0438 "
                "\u0434\u0430\u043d\u043d\u044b\u0435 \u0434\u043b\u044f "
                "\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432 "
                "\u2014 \u0440\u0430\u0437\u043d\u044b\u0435 "
                "\u043d\u0430\u0431\u043e\u0440\u044b "
                "\u0441\u0432\u0435\u0434\u0435\u043d\u0438\u0439."
            ),
            (
                'value={profile?.'
                'identity_document_status}'
            ),
            (
                'value={profile?.'
                'education_document_status}'
            ),
            "setSaveNotice(",
            'disabled={saving || !hasChanges}',
            (
                "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c "
                "\u0434\u0430\u043d\u043d\u044b\u0435"
            ),
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

    require_contains(
        "backend/app/api/v1/account.py",
        [
            '@router.get("/summary"',
            "async def get_account_summary(",
            '@router.get("/courses"',
            "async def get_account_courses(",
            '@router.get("/documents"',
            "async def get_account_documents(",
            '@router.get("/documents/{document_id}/download")',
            "async def get_account_document_download(",
            '@router.post("/courses/{course_id}/enroll"',
            "async def create_account_course_enrollment(",
            '@router.post("/courses/{enrollment_id}/start"',
            "async def start_account_course_learning(",
            '@router.post("/courses/{enrollment_id}/complete"',
            "async def complete_account_course_learning(",
        ],
    )

    require_contains(
        "backend/app/schemas/account.py",
        [
            "class AccountSummaryResponse(BaseModel):",
            "class AccountCourseItemResponse(BaseModel):",
            "class AccountCoursesResponse(BaseModel):",
            "class AccountDocumentItemResponse(BaseModel):",
            "download_available: bool = False",
            "class AccountDocumentsResponse(BaseModel):",
        ],
    )

    print("Account page behavior smoke passed")
    print(" - learner profile card contract covered")


if __name__ == "__main__":
    main()
