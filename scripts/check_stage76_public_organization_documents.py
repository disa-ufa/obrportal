from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "frontend" / "src" / "pages" / "OrganizationInfoPage.jsx"
DOC = ROOT / "docs" / "stage76-public-organization-documents.md"

REQUIRED_PAGE_FRAGMENTS = [
    "const DOCUMENT_GROUPS = [",
    "function DocumentGroupCard",
    'data-testid="organization-info-documents-section"',
    "Документы организации",
    "Официальные документы для публикации",
    "Учредительные документы",
    "Устав ГБОУ РЦДО",
    "Лицензия и образовательная деятельность",
    "Лицензия на образовательную деятельность",
    "Локальные нормативные акты",
    "Положение об обработке персональных данных",
    "Отчеты и обязательная публичная информация",
    "Отчет о самообследовании",
    "не публикуются непроверенные номера",
    "После загрузки и проверки утвержденного PDF-файла",
]

REQUIRED_DOC_FRAGMENTS = [
    "Stage 76 - Public organization documents section",
    "stage76_status=implementation_ready",
    "stage76_release_manifest_required=yes",
    "stage76_guard_required=yes",
    "stage76_no_unverified_legal_document_numbers=yes",
]

FORBIDDEN_PAGE_FRAGMENTS = [
    "href=",
    "download=",
    "target=",
    "license_number",
    "licenseNumber",
    "Номер лицензии",
    "Регистрационный номер лицензии",
    "№ лицензии",
    "серия лицензии",
    "дата выдачи лицензии",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 76 public organization documents guard failed: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def main() -> None:
    page_text = read(PAGE)
    doc_text = read(DOC)

    missing_page = [fragment for fragment in REQUIRED_PAGE_FRAGMENTS if fragment not in page_text]
    if missing_page:
        fail(f"OrganizationInfoPage.jsx misses required fragments: {missing_page}")

    missing_doc = [fragment for fragment in REQUIRED_DOC_FRAGMENTS if fragment not in doc_text]
    if missing_doc:
        fail(f"stage76 doc misses required fragments: {missing_doc}")

    forbidden = [fragment for fragment in FORBIDDEN_PAGE_FRAGMENTS if fragment in page_text]
    if forbidden:
        fail(f"OrganizationInfoPage.jsx contains forbidden unverified document fragments: {forbidden}")

    if page_text.count("DocumentGroupCard") < 2:
        fail("DocumentGroupCard must be defined and used")

    print("stage 76 public organization documents guard passed")


if __name__ == "__main__":
    main()
