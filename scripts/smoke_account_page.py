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
            "export async function getAccountLearnerProfile()",
            'return request("/api/v1/account/profile");',
            "export async function updateAccountLearnerProfile(payload)",
            'return request("/api/v1/account/profile", {',
            'method: "PATCH"',
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
            'import { AccountLearnerProfileCard } from "../components/account/AccountLearnerProfileCard";',
            "DocumentVerificationQrBlock",
            "<AccountLearnerProfileCard accountUser={profile} />",
            "AdminQuickFilterButtons",
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
            'import { useEffect, useMemo, useState } from "react";',
            "getAccountLearnerProfile,",
            "updateAccountLearnerProfile,",
            "const EMPTY_FORM = {",
            "const PROFILE_STATUS_LABELS = {",
            "function toFormData(profile)",
            "function normalizePayloadValue(field, value)",
            "function buildPayload(formData, profile)",
            "function formatProfileSaveError(error)",
            "export function AccountLearnerProfileCard({ accountUser })",
            "const [profile, setProfile] = useState(null);",
            "const [formData, setFormData] = useState({ ...EMPTY_FORM });",
            "const [loading, setLoading] = useState(true);",
            "const [saving, setSaving] = useState(false);",
            "getAccountLearnerProfile()",
            "updateAccountLearnerProfile(",
            "Learner profile with this SNILS already exists",
            "Invalid SNILS format or checksum",
            "Invalid learner profile email format",
            "Invalid learner profile phone format",
            'id="account-learner-profile"',
            'data-testid="account-learner-profile"',
            'data-testid="account-learner-profile-loading"',
            'data-testid="account-learner-profile-unavailable"',
            "disabled={saving || !hasChanges}",
            "ProfileStatusBadge",
            "identity_document_status",
            "education_document_status",
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
            '@router.get(',
            '"/profile",',
            "async def get_account_learner_profile(",
            '@router.patch(',
            "async def update_account_learner_profile(",
            "normalize_account_learner_profile_update_data(",
            '"Invalid learner profile email format"',
            '"Invalid learner profile phone format"',
            '"Invalid SNILS format or checksum"',
            '"Learner profile with this SNILS already exists"',
            '"account.learner_profile_created"',
            '"account.learner_profile_updated"',
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
            "class AccountLearnerProfileResponse(BaseModel):",
            "class AccountLearnerProfileUpdateRequest(BaseModel):",
            'identity_document_status: str = "not_provided"',
            'education_document_status: str = "not_provided"',
            "class AccountCourseItemResponse(BaseModel):",
            "class AccountCoursesResponse(BaseModel):",
            "class AccountDocumentItemResponse(BaseModel):",
            "download_available: bool = False",
            "class AccountDocumentsResponse(BaseModel):",
        ],
    )

    print("Account page behavior smoke passed")


if __name__ == "__main__":
    main()
