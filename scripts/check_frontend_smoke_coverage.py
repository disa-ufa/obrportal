from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = ROOT / "frontend" / "src"
SCRIPTS_ROOT = ROOT / "scripts"

FRONTEND_SUFFIXES = {".js", ".jsx"}

ALLOW_UNCOVERED = {
    # Keep this list empty by default.
    # Add explicit exceptions only for generated/vendor files if they appear later.
}

REQUIRED_FRONTEND_GUARD_SCRIPTS = [
    "scripts/secret_scan.py",
    "scripts/check_text_encoding.py",
    "scripts/check_source_bom.py",
    "scripts/check_frontend_api_errors.py",
    "scripts/check_frontend_mojibake.py",
    "scripts/frontend_guard.py",
    "scripts/check_ci_local_gate.py",
    "scripts/check_release_readiness.py",
    "scripts/check_release_versioning.py",
    "scripts/check_release_candidate.py",
    "scripts/check_release_tag.py",
    "scripts/check_production_deployment_plan.py",
    "scripts/check_production_environment_template.py",
    "scripts/check_production_server_checklist.py",
    "scripts/check_production_reverse_proxy_checklist.py",
    "scripts/check_production_backup_monitoring_checklist.py",
    "scripts/check_production_deployment_runbook.py",
    "scripts/check_production_rollout_inventory.py",
    "scripts/check_production_server_facts.py",
    "scripts/check_production_server_preflight_execution.py",
    "scripts/check_production_fact_collection_result.py",
    "scripts/check_production_server_remediation_plan.py",
    "scripts/check_frontend_bundle_encoding.py",
    "scripts/check_no_todo_markers.py",
]

REQUIRED_FRONTEND_SMOKE_SCRIPTS = [
    "scripts/smoke_auth_rbac.py",
    "scripts/smoke_frontend_admin_pages.py",
    "scripts/smoke_public_pages.py",
    "scripts/smoke_account_page.py",
    "scripts/smoke_frontend_hooks_layout.py",
    "scripts/smoke_frontend_utils_routes.py",
    "scripts/smoke_documents_page.py",
    "scripts/smoke_admin_components.py",
]


def get_frontend_smoke_guard_diagnostics(script_text: str) -> dict[str, object]:
    required_scripts = [
        *REQUIRED_FRONTEND_GUARD_SCRIPTS,
        *REQUIRED_FRONTEND_SMOKE_SCRIPTS,
    ]
    missing_script_files = [
        item for item in required_scripts if not (ROOT / item).exists()
    ]
    covered_frontend_files = [
        path
        for path in collect_frontend_files()
        if is_likely_covered(path, script_text)
    ]

    return {
        "requiredScriptsTotal": len(required_scripts),
        "guardScriptsTotal": len(REQUIRED_FRONTEND_GUARD_SCRIPTS),
        "smokeScriptsTotal": len(REQUIRED_FRONTEND_SMOKE_SCRIPTS),
        "missingScriptFiles": missing_script_files,
        "frontendFilesTotal": len(collect_frontend_files()),
        "coveredFrontendFilesTotal": len(covered_frontend_files),
        "allowedUncoveredTotal": len(ALLOW_UNCOVERED),
    }


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def collect_frontend_files() -> list[Path]:
    return sorted(
        [
            path
            for path in FRONTEND_ROOT.rglob("*")
            if path.is_file() and path.suffix in FRONTEND_SUFFIXES
        ],
        key=lambda path: path.as_posix().lower(),
    )


def collect_check_scripts_text() -> str:
    script_files = sorted(
        [
            path
            for path in SCRIPTS_ROOT.rglob("*.py")
            if path.is_file()
        ],
        key=lambda path: path.as_posix().lower(),
    )

    return "\n".join(read_text(path) for path in script_files)


def is_likely_covered(path: Path, script_text: str) -> bool:
    relative_path = path.relative_to(ROOT).as_posix()
    filename = path.name

    return relative_path in script_text or filename in script_text


def main() -> None:
    script_text = collect_check_scripts_text()
    frontend_diagnostics = get_frontend_smoke_guard_diagnostics(script_text)

    if frontend_diagnostics["missingScriptFiles"]:
        print("Required frontend smoke/guard scripts are missing:")
        for item in frontend_diagnostics["missingScriptFiles"]:
            print(f" - {item}")

        raise SystemExit(1)

    uncovered = []
    for path in collect_frontend_files():
        relative_path = path.relative_to(ROOT).as_posix()

        if relative_path in ALLOW_UNCOVERED:
            continue

        if not is_likely_covered(path, script_text):
            uncovered.append(relative_path)

    if uncovered:
        print("Frontend files without likely smoke/check coverage:")
        for item in uncovered:
            print(f" - {item}")

        raise SystemExit(1)

    print("frontend smoke/check coverage guard passed")
    print(
        "frontend smoke/guard diagnostics passed: "
        f"scripts={frontend_diagnostics['requiredScriptsTotal']}, "
        f"guard_scripts={frontend_diagnostics['guardScriptsTotal']}, "
        f"smoke_scripts={frontend_diagnostics['smokeScriptsTotal']}, "
        f"frontend_files={frontend_diagnostics['frontendFilesTotal']}, "
        f"covered_frontend_files={frontend_diagnostics['coveredFrontendFilesTotal']}"
    )


if __name__ == "__main__":
    main()
