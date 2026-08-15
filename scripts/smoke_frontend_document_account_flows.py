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


def require_any(relative_path: str, label: str, fragments: list[str]) -> None:
    text = read_text(relative_path)

    if not any(fragment in text for fragment in fragments):
        print(f"{relative_path} is missing any fragment for {label}:")
        for fragment in fragments:
            print(f" - {fragment}")
        raise SystemExit(1)


def require_occurs(relative_path: str, fragment: str, minimum: int) -> None:
    text = read_text(relative_path)
    count = text.count(fragment)

    if count < minimum:
        print(f"{relative_path} has too few occurrences of required fragment:")
        print(f" - fragment: {fragment}")
        print(f" - expected at least: {minimum}")
        print(f" - actual: {count}")
        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/pages/DocumentsPage.jsx",
        [
            "export function DocumentsPage",
            "useEffect",
            "useMemo",
            "useState",
            "SectionCard",
            "buildDocumentsPath",
        ],
    )
    require_any(
        "frontend/src/pages/DocumentsPage.jsx",
        "admin documents API load",
        [
            "getAdminDocuments",
            "loadDocuments",
            "admin documents",
        ],
    )
    require_any(
        "frontend/src/pages/DocumentsPage.jsx",
        "admin document download/publish/revoke actions",
        [
            "downloadAdminDocument",
            "publishAdminDocument",
            "revokeAdminDocument",
            "restoreAdminDocument",
            "deleteAdminDocument",
        ],
    )
    require_any(
        "frontend/src/pages/DocumentsPage.jsx",
        "document verification integration",
        [
            "DocumentVerificationQrBlock",
            "buildDocumentVerification",
            "verify-document",
            "verification",
        ],
    )
    require_occurs("frontend/src/pages/DocumentsPage.jsx", "useState(", 8)

    require_contains(
        "frontend/src/pages/AccountPage.jsx",
        [
            "export function AccountPage",
            "useEffect",
            "useState",
            "LearnerAccountLayout",
            "LearnerAccountDocuments",
            "getAccountSummary",
            "getAccountDocuments",
            "downloadAccountDocument",
            'id="account-documents"',
        ],
    )
    require_any(
        "frontend/src/pages/AccountPage.jsx",
        "account summary/documents API",
        [
            "getAccountSummary",
            "getAccountDocuments",
            "account documents",
            "accountSummary",
        ],
    )
    require_any(
        "frontend/src/pages/AccountPage.jsx",
        "learner enrollment actions",
        [
            "completeAccountEnrollment",
            "completeEnrollment",
            "enrollment",
            "course",
        ],
    )
    require_any(
        "frontend/src/pages/AccountPage.jsx",
        "account document download",
        [
            "downloadAccountDocument",
            "downloadDocument",
            "download",
        ],
    )
    require_occurs("frontend/src/pages/AccountPage.jsx", "useState(", 6)

    require_contains(
        "frontend/src/components/account/LearnerAccountDocuments.jsx",
        [
            "export function LearnerAccountDocuments",
            'data-testid="learner-account-documents"',
            "DocumentVerificationQrBlock",
            "verification_code",
            "document_number",
            "download_available",
            "revocation_reason",
            'data-testid="learner-documents-action-error"',
            "Скачать документ",
            "Проверить публично",
        ],
    )


    require_contains(
        "frontend/src/pages/VerifyDocumentPage.jsx",
        [
            "export function VerifyDocumentPage",
            "useState",
        ],
    )
    require_any(
        "frontend/src/pages/VerifyDocumentPage.jsx",
        "public verification API",
        [
            "verifyDocument",
            "getPublicDocumentVerification",
            "verification_code",
            "document_number",
        ],
    )
    require_any(
        "frontend/src/pages/VerifyDocumentPage.jsx",
        "query params support",
        [
            "URLSearchParams",
            "useSearchParams",
            "useLocation",
            "location.search",
        ],
    )

    require_contains(
        "frontend/src/components/documents/DocumentVerificationQrBlock.jsx",
        [
            "export function DocumentVerificationQrBlock",
        ],
    )
    require_any(
        "frontend/src/components/documents/DocumentVerificationQrBlock.jsx",
        "QR rendering",
        [
            "QRCode",
            "QRCodeSVG",
            "qr",
            "verification",
        ],
    )

    require_contains(
        "frontend/src/utils/documentVerification.js",
        [
            "export function",
        ],
    )
    require_any(
        "frontend/src/utils/documentVerification.js",
        "verification URL helpers",
        [
            "verify-document",
            "verification",
            "document_number",
            "verification_code",
        ],
    )

    require_contains(
        "frontend/src/api/client.js",
        [
            "API_BASE_URL",
            "request(",
        ],
    )
    require_any(
        "frontend/src/api/client.js",
        "account API client methods",
        [
            "getAccountSummary",
            "getAccountDocuments",
            "downloadAccountDocument",
            "/account",
        ],
    )
    require_any(
        "frontend/src/api/client.js",
        "document verification API client methods",
        [
            "verifyDocument",
            "verify-document",
            "/documents/verify",
            "verification",
        ],
    )
    require_any(
        "frontend/src/api/client.js",
        "admin document API client methods",
        [
            "getAdminDocuments",
            "downloadAdminDocument",
            "publishAdminDocument",
            "revokeAdminDocument",
            "restoreAdminDocument",
            "deleteAdminDocument",
        ],
    )

    print("Frontend document/account flows behavior smoke passed")


if __name__ == "__main__":
    main()
