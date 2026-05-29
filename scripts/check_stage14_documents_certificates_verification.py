from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC = ROOT / "docs" / "stage-14-documents-certificates-verification.md"
ROADMAP = ROOT / "docs" / "project-roadmap-after-stage9.md"
STAGE13_DOC = ROOT / "docs" / "stage-13-learning-flow.md"

REQUIRED_FILES = [
    ROOT / "backend" / "app" / "services" / "document_pdf.py",
    ROOT / "backend" / "app" / "services" / "document_templates.py",
    ROOT / "frontend" / "src" / "pages" / "DocumentsPage.jsx",
    ROOT / "frontend" / "src" / "pages" / "VerifyDocumentPage.jsx",
    ROOT / "frontend" / "src" / "components" / "documents" / "DocumentVerificationQrBlock.jsx",
    ROOT / "frontend" / "src" / "utils" / "documentVerification.js",
]

DOC_MARKERS = [
    "Status: in progress",
    "Stage 14 Documents / certificates / verification",
    "Stage 14 baseline",
    "v0.1.0-stage13-learning-flow-complete",
    "document templates",
    "PDF generation",
    "QR code",
    "document number",
    "public verification",
    "account document download",
    "admin document visibility",
    "document_runtime_changed=no",
    "secrets_printed=no",
]

ROADMAP_MARKERS = [
    "Stage 14 — Documents / certificates / verification",
    "stabilize generated educational documents",
    "document templates",
    "PDF generation",
    "QR code",
    "document number",
    "public verification",
]

STAGE13_MARKERS = [
    "Status: accepted",
    "Stage 13 accepted",
    "v0.1.0-stage13-learning-flow-complete",
    "document_link_flow_accepted=yes",
    "course_completion_accepted=yes",
]

FORBIDDEN_DOC_MARKERS = [
    "BOT_TOKEN=",
    "SECRET_KEY=",
    "SERVICE_SECRET=",
    "POSTGRES_PASSWORD=",
    "MINIO_SECRET_KEY=",
]


def read_text(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"[fail] required file missing: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def require_markers(path: Path, markers: list[str]) -> int:
    text = read_text(path)
    missing = [marker for marker in markers if marker not in text]
    if missing:
        print(f"[fail] missing markers in {path.relative_to(ROOT)}:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)
    return len(markers)


def check_required_files() -> int:
    missing = [path for path in REQUIRED_FILES if not path.exists()]
    if missing:
        print("[fail] required Stage 14 implementation anchor files missing:")
        for path in missing:
            print(f" - {path.relative_to(ROOT)}")
        raise SystemExit(1)
    return len(REQUIRED_FILES)


def check_no_secret_markers(path: Path) -> None:
    text = read_text(path)
    found = [marker for marker in FORBIDDEN_DOC_MARKERS if marker in text]
    if found:
        print(f"[fail] possible secret markers in {path.relative_to(ROOT)}:")
        for marker in found:
            print(f" - {marker}")
        raise SystemExit(1)


def main() -> None:
    check_no_secret_markers(DOC)

    doc_count = require_markers(DOC, DOC_MARKERS)
    roadmap_count = require_markers(ROADMAP, ROADMAP_MARKERS)
    stage13_count = require_markers(STAGE13_DOC, STAGE13_MARKERS)
    required_files_count = check_required_files()

    print(
        "stage 14 documents/certificates/verification diagnostics passed: "
        f"doc_markers={doc_count}, roadmap_markers={roadmap_count}, "
        f"stage13_markers={stage13_count}, required_files={required_files_count}, "
        "secrets_printed=no, document_runtime_changed=no"
    )


if __name__ == "__main__":
    main()
