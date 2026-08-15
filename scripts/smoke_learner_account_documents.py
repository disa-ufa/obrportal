from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8-sig")


def require_contains(
    relative_path: str,
    fragments: list[str],
) -> None:
    text = read_text(relative_path)
    missing = [
        fragment
        for fragment in fragments
        if fragment not in text
    ]

    if missing:
        print(f"{relative_path} is missing required fragments:")

        for fragment in missing:
            print(f" - {fragment}")

        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/components/account/LearnerAccountDocuments.jsx",
        [
            "export function LearnerAccountDocuments",
            "DOCUMENT_FILTERS",
            'label: "Все"',
            'label: "Доступные"',
            'label: "Ожидают публикации"',
            'label: "Отозванные"',
            'data-testid="learner-account-documents"',
            "aria-busy={loading}",
            'data-testid="learner-documents-stats"',
            'data-testid="learner-document-filters"',
            'data-testid="learner-document-card"',
            'data-testid="learner-documents-loading"',
            'role="status"',
            'aria-live="polite"',
            'data-testid="learner-documents-error"',
            'role="alert"',
            'data-testid="learner-documents-action-error"',
            'actionErrorMessage = ""',
            "Не удалось скачать документ",
            'data-testid="learner-documents-empty"',
            'data-testid="learner-documents-filter-empty"',
            'data-testid="learner-documents-list"',
            "DocumentVerificationQrBlock",
            "verification_code",
            "document_number",
            "download_available",
            "aria-busy={downloadLoadingId === documentItem.id}",
            "file_available",
            "revocation_reason",
            "Скачать документ",
            "Проверить публично",
            "Открыть моё обучение",
        ],
    )

    require_contains(
        "frontend/src/pages/AccountPage.jsx",
        [
            (
                'import { LearnerAccountDocuments } '
                'from "../components/account/'
                'LearnerAccountDocuments";'
            ),
            'documents: "account-documents"',
            'id="account-documents"',
            "<LearnerAccountDocuments",
            "documents={documents}",
            "selectedFilter={documentStatusFilter}",
            "loading={loading}",
            "errorMessage={error}",
            "actionErrorMessage={downloadError}",
            "downloadLoadingId={downloadLoadingId}",
            "onFilterChange={setDocumentStatusFilter}",
            "onDownload={handleDownload}",
            "onOpenCourse={onOpenCourse}",
            'handleAccountSectionChange("learning")',
            'activeAccountSection === "documents"',
        ],
    )

    account_page = read_text(
        "frontend/src/pages/AccountPage.jsx"
    )

    if "errorMessage={error || downloadError}" in account_page:
        raise SystemExit(
            "Document load and download errors are still combined"
        )

    print("Learner account documents smoke passed")
    print(" - document status filters covered")
    print(" - download state covered")
    print(" - QR/public verification covered")
    print(" - revoked document state covered")
    print(" - loading/error/empty states covered")


if __name__ == "__main__":
    main()