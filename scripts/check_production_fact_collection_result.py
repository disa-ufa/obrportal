from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESULT_PATH = ROOT / "docs" / "production-fact-collection-result.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"
REQUIRED_STAGE7_COMMIT = "c7cd9ac4763bfab9f905b311eaf1ef4df9f30381"
REQUIRED_STAGE8_INVENTORY_COMMIT = "415f3dd"
REQUIRED_STAGE8_SERVER_FACTS_COMMIT = "f2b1d13"
REQUIRED_STAGE8_PREFLIGHT_COMMIT = "53066d6"

REQUIRED_SECTIONS = [
    "# Production fact collection result",
    "## Purpose",
    "## Release baseline",
    "## Source documents",
    "## Collection status",
    "## Sanitized server facts summary",
    "## Sanitized command result checklist",
    "## Server facts update target",
    "## Local verification after fact update",
    "## Acceptance criteria",
    "## Result diagnostics",
]

REQUIRED_SOURCE_DOCUMENTS = [
    "docs/production-server-preflight-execution.md",
    "docs/production-server-facts.md",
    "docs/production-rollout-inventory.md",
    "docs/production-deployment-runbook.md",
]

REQUIRED_TABLE_ITEMS = [
    "Local preflight completed",
    "Server access checked",
    "Capacity checked",
    "Docker checked",
    "Git checked",
    "Directories checked",
    "Network ports checked",
    "Reverse proxy checked",
    "`.env` existence checked",
    "Backup root checked",
    "Server facts updated",
    "Provider",
    "Server name",
    "Server public IP",
    "Operating system",
    "CPU/RAM/Disk summary",
    "SSH user",
    "Application directory",
    "Backup directory",
    "Reverse proxy",
    "Production domain",
    "HTTPS status",
]

REQUIRED_COMMANDS = [
    "python .\\scripts\\check_production_server_preflight_execution.py",
    "python .\\scripts\\check_production_server_facts.py",
    "python .\\scripts\\check_production_rollout_inventory.py",
    "python .\\scripts\\check_production_deployment_runbook.py",
    "python .\\scripts\\check_production_backup_monitoring_checklist.py",
    "python .\\scripts\\check_production_reverse_proxy_checklist.py",
    "python .\\scripts\\check_production_server_checklist.py",
    "python .\\scripts\\check_production_environment_template.py",
    "python .\\scripts\\check_production_deployment_plan.py",
    "python .\\scripts\\check_ci_local_gate.py",
    "python .\\scripts\\check_release_readiness.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_production_fact_collection_result.py",
]

REQUIRED_MARKERS = [
    "This document records the sanitized result of production server fact collection before real ObrPortal deployment.",
    "It must not contain passwords, tokens, private keys, production `.env` values or any other secrets.",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`",
    "- Stage 8 rollout inventory checkpoint: `415f3dd`",
    "- Stage 8 server facts checkpoint: `f2b1d13`",
    "- Stage 8 preflight checkpoint: `53066d6`",
    "Do not paste secret values. Record only safe summaries.",
    "After collecting facts, update only non-secret values in:",
    "- `docs/production-server-facts.md`",
    "Keep `<pending>` for unknown facts.",
    "Never commit:",
    "- passwords;",
    "- tokens;",
    "- private keys;",
    "- production `.env` values;",
    "- database credentials;",
    "- storage credentials;",
    "- session secrets;",
    "- API secrets.",
    "- Fact collection result document exists.",
    "- Secret-safe collection status is documented.",
    "- Sanitized server facts summary is documented.",
    "- Sanitized command result checklist is documented.",
    "- Server facts update target is documented.",
    "- Secret exclusion rules are documented.",
    "- Local verification commands are documented.",
    "- No secrets are committed to Git.",
]


def read_result() -> str:
    if not RESULT_PATH.exists():
        raise SystemExit("Required production fact collection result document is missing: docs/production-fact-collection-result.md")

    return RESULT_PATH.read_text(encoding="utf-8")


def get_production_fact_collection_result_diagnostics(result_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in result_text]
    missing_source_documents = [document for document in REQUIRED_SOURCE_DOCUMENTS if f"`{document}`" not in result_text]
    missing_table_items = [item for item in REQUIRED_TABLE_ITEMS if item not in result_text]
    missing_commands = [command for command in REQUIRED_COMMANDS if command not in result_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in result_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "requiredStage7Commit": REQUIRED_STAGE7_COMMIT,
        "requiredStage8InventoryCommit": REQUIRED_STAGE8_INVENTORY_COMMIT,
        "requiredStage8ServerFactsCommit": REQUIRED_STAGE8_SERVER_FACTS_COMMIT,
        "requiredStage8PreflightCommit": REQUIRED_STAGE8_PREFLIGHT_COMMIT,
        "missingSections": missing_sections,
        "missingSourceDocuments": missing_source_documents,
        "missingTableItems": missing_table_items,
        "missingCommands": missing_commands,
        "missingMarkers": missing_markers,
        "ok": not missing_sections
        and not missing_source_documents
        and not missing_table_items
        and not missing_commands
        and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_fact_collection_result_diagnostics(read_result())

    for key in ["missingSections", "missingSourceDocuments", "missingTableItems", "missingCommands", "missingMarkers"]:
        if diagnostics[key]:
            print(f"Production fact collection result diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production fact collection result diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"source_documents={len(REQUIRED_SOURCE_DOCUMENTS)}, "
        f"table_items={len(REQUIRED_TABLE_ITEMS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
