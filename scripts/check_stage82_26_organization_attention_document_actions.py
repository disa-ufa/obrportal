from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx"
DOC = ROOT / "docs" / "stage82-organization-attention-document-actions.md"


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.26 organization attention document actions guard failed: {message}")


def read_required(path: Path) -> str:
    if not path.exists():
        fail(f"{path.relative_to(ROOT)} is missing")
    return path.read_text(encoding="utf-8")


def main() -> None:
    panel = read_required(PANEL)
    doc = read_required(DOC)

    panel_markers = [
        "stage82_26_organization_attention_document_actions",
        "ORGANIZATION_ATTENTION_DOCUMENT_ACTION_LABELS",
        "const [copiedActionId, setCopiedActionId]",
        "clipboardSupported",
        "handleCopyOrganizationAttentionDocumentAction",
        "navigator.clipboard",
        "setCopiedActionId(actionId)",
        "data-stage-document-actions",
        "hasDocumentNumber",
        "hasVerificationCode",
        "documentNumberActionId",
        "verificationCodeActionId",
        "organization-learning-attention-copy-document-number-button",
        "organization-learning-attention-copy-verification-code-button",
        "organization-learning-attention-verify-link",
    ]
    missing_panel = [marker for marker in panel_markers if marker not in panel]
    if missing_panel:
        fail("missing panel markers: " + ", ".join(missing_panel))

    doc_markers = [
        "Stage 82.26",
        "Frontend-only",
        "copy document number",
        "copy verification code",
        "copied feedback",
        "Backend unchanged",
        "Database unchanged",
        "No migration required",
    ]
    missing_doc = [marker for marker in doc_markers if marker not in doc]
    if missing_doc:
        fail("missing doc markers: " + ", ".join(missing_doc))

    print("stage 82.26 organization attention document actions guard passed")


if __name__ == "__main__":
    main()
