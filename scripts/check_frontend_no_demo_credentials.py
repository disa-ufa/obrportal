from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_SRC = ROOT / "frontend" / "src"
APP = FRONTEND_SRC / "App.jsx"

FORBIDDEN_FRONTEND_MARKERS = [
    "admin@obrportal.local",
    "Admin123Local2026!",
    "learner@obrportal.local",
    "Learner123Local2026!",
    'useState("admin@obrportal.local")',
    'useState("Admin123Local2026!")',
]

REQUIRED_APP_MARKERS = [
    'const [email, setEmail] = useState("");',
    'const [password, setPassword] = useState("");',
]


def iter_frontend_files() -> list[Path]:
    return sorted(
        [
            *FRONTEND_SRC.rglob("*.js"),
            *FRONTEND_SRC.rglob("*.jsx"),
            *FRONTEND_SRC.rglob("*.ts"),
            *FRONTEND_SRC.rglob("*.tsx"),
        ]
    )


def main() -> None:
    if not FRONTEND_SRC.exists():
        raise SystemExit("frontend/src is missing")

    if not APP.exists():
        raise SystemExit("frontend/src/App.jsx is missing")

    app_text = APP.read_text(encoding="utf-8")

    missing_app_markers = [
        marker
        for marker in REQUIRED_APP_MARKERS
        if marker not in app_text
    ]

    if missing_app_markers:
        print("frontend no demo credentials diagnostics failed")
        print("missing App.jsx markers:")
        for marker in missing_app_markers:
            print(f" - {marker}")
        raise SystemExit(1)

    violations: list[str] = []

    for file_path in iter_frontend_files():
        text = file_path.read_text(encoding="utf-8")
        for marker in FORBIDDEN_FRONTEND_MARKERS:
            if marker in text:
                violations.append(f"{file_path.relative_to(ROOT)}: {marker}")

    if violations:
        print("frontend no demo credentials diagnostics failed")
        print("forbidden demo credential markers:")
        for violation in violations:
            print(f" - {violation}")
        raise SystemExit(1)

    print(
        "frontend no demo credentials diagnostics passed: "
        f"frontend_files={len(iter_frontend_files())}, "
        f"required_app_markers={len(REQUIRED_APP_MARKERS)}, "
        f"forbidden_markers={len(FORBIDDEN_FRONTEND_MARKERS)}"
    )


if __name__ == "__main__":
    main()
