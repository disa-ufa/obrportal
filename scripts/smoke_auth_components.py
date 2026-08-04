from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


COMPONENT_REQUIREMENTS = {
    "frontend/src/components/auth/AuthLayout.jsx": [
        "export function AuthLayout",
        'data-testid="auth-layout"',
        "xl:grid-cols-",
        "brand",
        "children",
        "reverse",
    ],
    "frontend/src/components/auth/AuthBrandPanel.jsx": [
        "export function AuthBrandPanel",
        'data-testid="auth-brand-panel"',
        "BookOpenCheck",
        "eyebrow",
        "title",
        "description",
    ],
    "frontend/src/components/auth/AuthCard.jsx": [
        "export function AuthCard",
        'data-testid="auth-card"',
        "title",
        "subtitle",
        "children",
        "footer",
    ],
    "frontend/src/components/auth/AuthField.jsx": [
        'import { useId } from "react";',
        "export function AuthField",
        'data-testid="auth-field"',
        "aria-invalid",
        "aria-describedby",
        "required",
        "error",
    ],
    "frontend/src/components/auth/PasswordField.jsx": [
        'import { useId, useState } from "react";',
        'import { Eye, EyeOff } from "lucide-react";',
        "export function PasswordField",
        'data-testid="password-field"',
        'aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}',
        "aria-pressed",
    ],
    "frontend/src/components/auth/AuthSecurityNotice.jsx": [
        "export function AuthSecurityNotice",
        'data-testid="auth-security-notice"',
        "ShieldCheck",
        "title",
        "children",
    ],
    "frontend/src/components/auth/AuthSteps.jsx": [
        "export function AuthSteps",
        'data-testid="auth-steps"',
        'aria-current={active ? "step" : undefined}',
        "activeStep",
        "steps.map",
        "Check",
    ],
}


def require_fragments(
    relative_path: str,
    fragments: list[str],
) -> None:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    text = path.read_text(encoding="utf-8")
    missing = [
        fragment
        for fragment in fragments
        if fragment not in text
    ]

    if missing:
        print(f"{relative_path} is missing fragments:")

        for fragment in missing:
            print(f" - {fragment}")

        raise SystemExit(1)


def main() -> None:
    for relative_path, fragments in COMPONENT_REQUIREMENTS.items():
        require_fragments(relative_path, fragments)

    required_ci_command = (
        "python scripts/smoke_auth_components.py"
    )

    require_fragments(
        ".github/workflows/ci.yml",
        [required_ci_command],
    )

    require_fragments(
        "scripts/check_ci_local_gate.py",
        [required_ci_command],
    )

    print("Auth shared components smoke: PASSED")
    print(" - responsive two-column auth layout")
    print(" - reusable brand and card panels")
    print(" - accessible text and password fields")
    print(" - security notice and progress steps")
    print(" - smoke wired into CI local gate")


if __name__ == "__main__":
    main()
