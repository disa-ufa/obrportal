from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTER_PAGE_PATH = ROOT / "frontend/src/pages/RegisterPage.jsx"


def require_fragments(
    path: Path,
    fragments: list[str],
) -> str:
    if not path.exists():
        raise SystemExit(f"File not found: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")

    missing = [
        fragment
        for fragment in fragments
        if fragment not in text
    ]

    if missing:
        print(f"{path.relative_to(ROOT)} is missing fragments:")

        for fragment in missing:
            print(f" - {fragment}")

        raise SystemExit(1)

    return text


def reject_fragments(
    path: Path,
    text: str,
    fragments: list[str],
) -> None:
    present = [
        fragment
        for fragment in fragments
        if fragment in text
    ]

    if present:
        print(
            f"{path.relative_to(ROOT)} contains legacy fragments:"
        )

        for fragment in present:
            print(f" - {fragment}")

        raise SystemExit(1)


def main() -> None:
    page = require_fragments(
        REGISTER_PAGE_PATH,
        [
            'import { AuthBrandPanel }',
            'import { AuthCard }',
            'import { AuthField }',
            'import { AuthLayout }',
            'import { AuthSecurityNotice }',
            'import { AuthSteps }',
            'title="Начните обучение в ОбрПортале"',
            'title={cardTitle}',
            'steps={REGISTRATION_STEPS}',
            'activeStep={acceptedMessage ? 1 : 0}',
            'id="register-last-name"',
            'id="register-first-name"',
            'id="register-middle-name"',
            'id="register-email"',
            'id="register-phone"',
            'aria-busy={loading}',
            'if (!personalDataConsent)',
            'if (!termsAccepted)',
            'const response = await onRegister({',
            'personal_data_consent: true',
            'terms_accepted: true',
            'setAcceptedMessage(',
            '<Alert title="Заявка принята" tone="green">',
            'onPageChange("login")',
            'pendingCourseLoading',
            'pendingCourseError',
            'Создать учётную запись',
        ],
    )

    reject_fragments(
        REGISTER_PAGE_PATH,
        page,
        [
            'import { SectionCard }',
            'title="Что будет дальше"',
            'className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"',
        ],
    )

    command = "python scripts/smoke_register_page_layout.py"

    require_fragments(
        ROOT / ".github/workflows/ci.yml",
        [command],
    )

    require_fragments(
        ROOT / "scripts/check_ci_local_gate.py",
        [command],
    )

    print("Register page shared layout smoke: PASSED")
    print(" - shared auth layout and registration steps")
    print(" - reusable accessible registration fields")
    print(" - consent requirements preserved")
    print(" - accepted neutral response preserved")
    print(" - pending enrollment flow preserved")
    print(" - legacy registration cards removed")


if __name__ == "__main__":
    main()
