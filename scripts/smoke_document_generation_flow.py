from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

CHECKS = {
    "backend/app/services/completion_documents.py": [
        "COMPLETION_DOCUMENT_TEMPLATE_VERSION",
        "write_completion_document_pdf_to_storage",
        "build_completion_document_storage_path",
        "mark_completion_document_generation_metadata",
        "add_completion_document_generation_event",
        "ensure_completion_document_for_enrollment",
    ],
    "backend/app/models/document_record.py": [
        "generated_at",
        "generated_by_user_id",
        "generation_source",
        "generation_template_version",
    ],
    "backend/app/models/document_generation_event.py": [
        "class DocumentGenerationEvent",
        "__tablename__ = \"document_generation_events\"",
        "document_id",
        "storage_path",
        "source",
        "template_version",
        "generated_at",
    ],
    "backend/app/api/v1/admin.py": [
        "regenerate_admin_completion_document",
        "list_admin_document_generation_events",
        "download_admin_document_generation_event",
        "admin.document_regenerated",
    ],
    "backend/app/tests/test_auth_rbac_admin_api.py": [
        "test_admin_can_regenerate_generated_completion_document",
        "generation_events_before",
        "generation_events_after",
        "get_admin_document_generation_event_download_response",
    ],
    "frontend/src/api/client.js": [
        "regenerateAdminDocument",
        "getAdminDocumentGenerationEvents",
        "downloadAdminDocumentGenerationEvent",
    ],
    "frontend/src/pages/DocumentsPage.jsx": [
        "handleRegenerateCompletionDocument",
        "handleLoadGenerationEvents",
        "handleDownloadGenerationEvent",
        "document-regenerate-pdf-action",
        "document-generation-metadata",
        "document-generation-events",
        "document-generation-event-download-action",
        "Паспорт генерации PDF",
        "История PDF-артефактов",
        "Пересобрать PDF",
        "Скачать версию",
    ],
}


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def main() -> None:
    for relative_path, fragments in CHECKS.items():
        text = read_text(relative_path)
        missing = [fragment for fragment in fragments if fragment not in text]

        if missing:
            print(f"{relative_path} is missing required fragments:")
            for fragment in missing:
                print(f" - {fragment}")
            raise SystemExit(1)

    print("Document generation flow smoke passed")


if __name__ == "__main__":
    main()
