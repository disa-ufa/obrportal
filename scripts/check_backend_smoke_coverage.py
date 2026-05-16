from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = ROOT / "backend" / "app"
SCRIPTS_ROOT = ROOT / "scripts"

ALLOW_UNCOVERED = {
    # DB/bootstrap infrastructure is covered by app startup, migrations,
    # local_bootstrap and live API smoke, not by direct unit imports.
    "backend/app/db/base.py",
    "backend/app/db/session.py",
    "backend/app/models/base.py",

    # Seed/bootstrap scripts are executed through local_bootstrap/manual setup.
    # They require env variables and a live DB, so they are intentionally not
    # treated as regular unit-test targets.
    "backend/app/db/seed.py",
    "backend/app/db/seed_admin.py",
    "backend/app/db/seed_demo_learning.py",
    "backend/app/db/seed_demo_organization.py",
    "backend/app/db/seed_demo_user.py",
    "backend/app/db/seed_org.py",
}

EXPLICIT_COVERAGE_HINTS = {
    "backend/app/api/v1/admin.py": [
        "/api/v1/admin/users",
        "/api/v1/admin/roles",
        "/api/v1/admin/documents",
    ],
    "backend/app/api/v1/router.py": [
        "/api/v1/auth/login",
        "/api/v1/admin/users",
        "/api/v1/org/groups",
    ],
    "backend/app/api/v1/system.py": [
        "/api/v1/ready",
        "/health",
    ],
    "backend/app/main.py": [
        "/api/v1/ready",
        "/health",
    ],
    "backend/app/models/audit_event.py": [
        "/api/v1/admin/audit-events",
    ],
    "backend/app/models/course.py": [
        "/api/v1/admin/courses",
        "/api/v1/courses",
    ],
    "backend/app/models/document_record.py": [
        "/api/v1/admin/documents",
        "/api/v1/documents/verify",
    ],
    "backend/app/models/enrollment.py": [
        "/api/v1/admin/enrollments",
        "/api/v1/account/courses",
    ],
    "backend/app/models/learning_group.py": [
        "/api/v1/org/groups",
    ],
    "backend/app/models/organization.py": [
        "/api/v1/admin/organizations",
        "/api/v1/org/profile",
    ],
    "backend/app/models/role.py": [
        "/api/v1/admin/roles",
        "/api/v1/admin/permissions",
    ],
    "backend/app/models/user.py": [
        "/api/v1/admin/users",
        "/api/v1/auth/login",
    ],
    "backend/app/schemas/admin.py": [
        "/api/v1/admin/users",
        "/api/v1/admin/roles",
        "/api/v1/admin/documents",
    ],
    "backend/app/schemas/system.py": [
        "/api/v1/ready",
    ],
    "backend/app/services/completion_documents.py": [
        "learner course completion creates draft document",
        "admin completion creates draft document",
        "publish generated completion document",
    ],
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def collect_backend_files() -> list[Path]:
    return sorted(
        [
            path
            for path in BACKEND_ROOT.rglob("*.py")
            if path.is_file()
            and "__pycache__" not in path.parts
            and "tests" not in path.parts
            and not path.name.startswith("__")
        ],
        key=lambda path: path.as_posix().lower(),
    )


def collect_coverage_text() -> str:
    test_files = sorted(
        [
            path
            for path in (BACKEND_ROOT / "tests").rglob("test_*.py")
            if path.is_file()
        ],
        key=lambda path: path.as_posix().lower(),
    )

    script_files = sorted(
        [
            path
            for path in SCRIPTS_ROOT.rglob("*.py")
            if path.is_file()
            and path.resolve() != Path(__file__).resolve()
        ],
        key=lambda path: path.as_posix().lower(),
    )

    return "\n".join(read_text(path) for path in [*test_files, *script_files])


def app_module_path(path: Path) -> str:
    relative_parts = path.relative_to(BACKEND_ROOT).with_suffix("").parts
    return "app." + ".".join(relative_parts)


def has_explicit_coverage_hint(relative_path: str, coverage_text: str) -> bool:
    hints = EXPLICIT_COVERAGE_HINTS.get(relative_path, [])

    return any(hint in coverage_text for hint in hints)


def is_likely_covered(path: Path, coverage_text: str) -> bool:
    relative_path = path.relative_to(ROOT).as_posix()
    module_path = app_module_path(path)

    return (
        relative_path in coverage_text
        or path.name in coverage_text
        or f"from {module_path} import" in coverage_text
        or f"import {module_path}" in coverage_text
        or has_explicit_coverage_hint(relative_path, coverage_text)
    )


def main() -> None:
    coverage_text = collect_coverage_text()

    uncovered = []
    allowed = []

    for path in collect_backend_files():
        relative_path = path.relative_to(ROOT).as_posix()

        if relative_path in ALLOW_UNCOVERED:
            allowed.append(relative_path)
            continue

        if not is_likely_covered(path, coverage_text):
            uncovered.append(relative_path)

    if uncovered:
        print("Backend files without likely pytest/smoke/check coverage:")
        for item in uncovered:
            print(f" - {item}")

        if allowed:
            print("\nAllowed uncovered backend infrastructure/bootstrap files:")
            for item in allowed:
                print(f" - {item}")

        raise SystemExit(1)

    print("backend pytest/smoke/check coverage guard passed")

    if allowed:
        print("Allowed uncovered backend infrastructure/bootstrap files:")
        for item in allowed:
            print(f" - {item}")


if __name__ == "__main__":
    main()
