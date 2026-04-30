from __future__ import annotations

from pathlib import Path


def u(value: str) -> str:
    return value.encode("ascii").decode("unicode_escape")


CRITICAL_FILES = [
    Path(".env.example"),
    Path("backend/app/core/config.py"),
    Path("backend/app/services/document_pdf.py"),
    Path("backend/app/services/document_templates.py"),
    Path("backend/app/tests/test_document_pdf.py"),
    Path("frontend/src/pages/AccountPage.jsx"),
    Path("frontend/src/pages/DocumentsPage.jsx"),
    Path("frontend/src/pages/VerifyDocumentPage.jsx"),
    Path("frontend/src/components/documents/DocumentVerificationQrBlock.jsx"),
    Path("frontend/src/utils/documentVerification.js"),
]


FORBIDDEN_MARKERS = [
    "?" * 4,
    u(r"\u0420\u045f"),  # ??
    u(r"\u0420\u045d"),  # ??
    u(r"\u0420\u201d"),  # ??
    u(r"\u0420\u040e"),  # ??
    u(r"\u0420\u0406"),  # ??
    u(r"\u0420\u0491"),  # ??
    u(r"\u0421\u0453"),  # ??
    u(r"\u0421\u201a"),  # ??
    u(r"\u0421\u0403"),  # ??
    u(r"\u0421\u2021"),  # ??
    u(r"\u0421\u20ac"),  # ??
    u(r"\u0421\u2039"),  # ??
    u(r"\u0421\u040a"),  # ??
    u(r"\u0421\u040e"),  # ??
    u(r"\u0421\u040f"),  # ??
    u(r"\u0412\u00ab"),  # ??
    u(r"\u0412\u00bb"),  # ??
]


REQUIRED_BY_FILE = {
    Path(".env.example"): [
        u(r"\u0413\u0411\u041e\u0423 \u0420\u0426\u0414\u041e"),
        u(r"\u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430 \u0411\u0430\u0448\u043a\u043e\u0440\u0442\u043e\u0441\u0442\u0430\u043d"),
        "DOCUMENT_ORG_INN=0278000001",
        u(r"\u041e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0435 \u043b\u0438\u0446\u043e"),
    ],
    Path("frontend/src/pages/AccountPage.jsx"): [
        u(r"\u0421\u043a\u0430\u0447\u0430\u0442\u044c PDF"),
        u(r"\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"),
        u(r"\u041e\u0436\u0438\u0434\u0430\u0435\u0442 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438"),
        u(r"\u0424\u0430\u0439\u043b \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442"),
        "showPublicLink",
    ],
    Path("frontend/src/pages/DocumentsPage.jsx"): [
        u(r"\u0421\u043a\u0430\u0447\u0430\u0442\u044c PDF"),
        u(r"\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0444\u0430\u0439\u043b"),
        "showPublicLink",
        "DocumentVerificationQrBlock",
    ],
    Path("frontend/src/pages/VerifyDocumentPage.jsx"): [
        "const RU =",
        "completed_at",
        "course_hours",
        "course_format",
        "issuer_name",
        "issuer_short_name",
        "issuer_address",
        "issuer_license",
        "issuer_inn",
        "issuer_kpp",
        "issuer_ogrn",
    ],
    Path("frontend/src/utils/documentVerification.js"): [
        r"\u0430-\u044f",
        r"\u0410-\u042f",
        r"\u0451",
        r"\u0401",
    ],
}


def main() -> int:
    failed = False

    for file_path in CRITICAL_FILES:
        if not file_path.exists():
            print(f"[missing file] {file_path}")
            failed = True
            continue

        text = file_path.read_text(encoding="utf-8-sig")

        found_forbidden = [marker for marker in FORBIDDEN_MARKERS if marker in text]
        missing_required = [
            value
            for value in REQUIRED_BY_FILE.get(file_path, [])
            if value not in text
        ]

        if found_forbidden or missing_required:
            failed = True
            print(f"[fail] {file_path}")

            if found_forbidden:
                printable = [repr(value) for value in found_forbidden]
                print(f"  forbidden markers: {printable}")

            if missing_required:
                printable = [repr(value) for value in missing_required]
                print(f"  missing required strings: {printable}")
        else:
            print(f"[ok] {file_path}")

    if failed:
        raise SystemExit("text encoding guard failed")

    print("text encoding guard passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
