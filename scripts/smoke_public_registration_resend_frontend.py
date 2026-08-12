from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

CLIENT_PATH = ROOT / "frontend/src/api/client.js"
REGISTER_PATH = ROOT / "frontend/src/pages/RegisterPage.jsx"


def read(path: Path) -> str:
    if not path.exists():
        raise SystemExit(
            f"Missing file: {path.relative_to(ROOT)}"
        )

    return path.read_text(encoding="utf-8")


def require(
    path: Path,
    text: str,
    fragments: list[str],
) -> None:
    missing = [
        fragment
        for fragment in fragments
        if fragment not in text
    ]

    if not missing:
        return

    print(
        f"{path.relative_to(ROOT)} "
        "is missing resend fragments:"
    )

    for fragment in missing:
        print(f" - {fragment}")

    raise SystemExit(1)


def main() -> None:
    client = read(CLIENT_PATH)
    register = read(REGISTER_PATH)

    require(
        CLIENT_PATH,
        client,
        [
            (
                "export async function "
                "resendPublicRegistration(email)"
            ),
            (
                'request("/api/v1/auth/'
                'resend-registration",'
            ),
            'method: "POST"',
            "JSON.stringify({ email })",
        ],
    )

    require(
        REGISTER_PATH,
        register,
        [
            "resendPublicRegistration",
            (
                "const [resendLoading, "
                "setResendLoading] = useState(false);"
            ),
            (
                "const [resendError, "
                'setResendError] = useState("");'
            ),
            (
                "const [resendMessage, "
                'setResendMessage] = useState("");'
            ),
            "async function handleResend()",
            (
                "await resendPublicRegistration("
                "submittedEmail"
            ),
            "setResendLoading(true);",
            "setResendLoading(false);",
            "setResendError(",
            "setResendMessage(",
            "Отправить письмо повторно",
            "onClick={handleResend}",
            (
                "disabled={"
                "resendLoading || !submittedEmail"
            ),
        ],
    )

    if 'type="password"' in register:
        raise SystemExit(
            "RegisterPage must remain passwordless."
        )

    if 'to="/privacy"' not in register:
        raise SystemExit(
            "Privacy link disappeared from registration."
        )

    if 'to="/offer"' not in register:
        raise SystemExit(
            "Offer link disappeared from registration."
        )

    print(
        "Public registration frontend resend "
        "smoke: PASSED"
    )
    print(
        " - resend API client method present"
    )
    print(
        " - accepted-state resend action present"
    )
    print(
        " - resend loading/error/success state present"
    )
    print(
        " - registration remains passwordless"
    )
    print(
        " - legal links preserved"
    )


if __name__ == "__main__":
    main()
