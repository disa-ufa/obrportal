from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-restore-drill-runbook.md"

REQUIRED_MARKERS = [
    "# Production restore drill runbook",
    "Status: drafted",
    "Stage: 11.2",
    "Production hardened tag: v0.1.0-stage10-production-hardened",
    "The restore drill must validate backup usability without changing production data",
    "docker compose down -v",
    "deleting production volumes",
    "restoring a dump into the production database",
    "printing secrets",
    "committing backup files to git",
    "/opt/obrportal/backups/post-hardening-20260527-132749/postgres.dump",
    "postgres.dump.sha256",
    "checksum must be verified",
    "temporary isolated postgres container or database",
    "The drill must not use the production postgres container as restore target",
    "restore dump into the temporary isolated target",
    "temporary database contains application tables",
    "production /api/v1/ready remains green",
    "public /login remains HTTP 200",
    "public /admin remains HTTP 200",
    "temporary resources are removed",
    "do not remove production volumes",
    "do not remove production backup",
    "/opt/obrportal/tmp",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Safety rules",
    "## 3. Backup source",
    "## 4. Isolated restore target",
    "## 5. Restore drill procedure",
    "## 6. Acceptance criteria",
    "## 7. Rollback and cleanup",
    "## 8. Evidence",
]


def main() -> None:
    if not DOC.exists():
        raise SystemExit(f"missing required document: {DOC.relative_to(ROOT)}")

    text = DOC.read_text(encoding="utf-8")

    missing = [
        marker
        for marker in [*REQUIRED_MARKERS, *REQUIRED_SECTIONS]
        if marker not in text
    ]

    if missing:
        print("production restore drill runbook diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    safety_markers = text.count("must not") + text.count("Forbidden") + text.count("do not")

    if sections < 8:
        raise SystemExit(f"expected at least 8 sections, got {sections}")

    if safety_markers < 7:
        raise SystemExit(f"expected at least 7 safety markers, got {safety_markers}")

    print(
        "production restore drill runbook diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
