from __future__ import annotations

import json
from pathlib import Path


DIST_DIR = Path("frontend/dist")
TEXT_SUFFIXES = {".html", ".js", ".css"}


def u(value: str) -> str:
    return value.encode("ascii").decode("unicode_escape")


def js_escape(value: str) -> str:
    return json.dumps(value, ensure_ascii=True)[1:-1]


FORBIDDEN_MARKERS = [
    "?" * 4,
    "\ufffd",
    u(r"\u0420\u045f"),
    u(r"\u0420\u045d"),
    u(r"\u0420\u201d"),
    u(r"\u0420\u040e"),
    u(r"\u0420\u0406"),
    u(r"\u0420\u0491"),
    u(r"\u0421\u0453"),
    u(r"\u0421\u201a"),
    u(r"\u0421\u0403"),
    u(r"\u0421\u2021"),
    u(r"\u0421\u20ac"),
    u(r"\u0421\u2039"),
    u(r"\u0421\u040a"),
    u(r"\u0421\u040e"),
    u(r"\u0421\u040f"),
    u(r"\u0412\u00ab"),
    u(r"\u0412\u00bb"),
]


REQUIRED_VISIBLE_TEXT = [
    u(r"\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430"),
    u(r"\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d"),
    u(r"\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043e\u0437\u0432\u0430\u043d"),
    u(r"\u0414\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f"),
    u(r"\u041e\u0431\u044a\u0451\u043c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b"),
    u(r"\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f-\u0438\u0437\u0434\u0430\u0442\u0435\u043b\u044c"),
    u(r"\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u0441\u0441\u044b\u043b\u043a\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438"),
    u(r"\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442"),
    u(r"\u0424\u0430\u0439\u043b \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442"),
    u(r"\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f"),
    u(r"\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443"),
    u(r"\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430"),
    u(r"\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u043a\u0443\u0440\u0441\u0430"),
    u(r"\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438"),
    u(r"\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438"),
    u(r"\u0413\u0440\u0443\u043f\u043f\u044b"),
    u(r"\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f"),
    u(r"\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b"),
    u(r"\u0420\u043e\u043b\u0438"),
    u(r"\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u044f"),
    u(r"\u0410\u0443\u0434\u0438\u0442"),
]


REQUIRED_TECHNICAL_MARKERS = [
    "/verify-document",
    "verify-document",
    "public-document-verification-qr",
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
    "/admin/courses",
    "/api/v1/admin/courses",
    "/admin/users",
    "/admin/organizations",
    "/admin/groups",
    "/admin/enrollments",
    "/admin/documents",
    "/admin/roles",
    "/admin/permissions",
    "/admin/audit-events",
    "/api/v1/admin/users",
    "/api/v1/admin/organizations",
    "/api/v1/org/groups",
    "/api/v1/admin/enrollments",
    "/api/v1/admin/documents",
    "/api/v1/admin/roles",
    "/api/v1/admin/permissions",
    "/api/v1/admin/audit-events",
]


def contains_visible_text(bundle_text: str, value: str) -> bool:
    return value in bundle_text or js_escape(value) in bundle_text


def main() -> int:
    if not DIST_DIR.exists():
        raise SystemExit("frontend/dist not found; run frontend build first")

    files = [
        path
        for path in sorted(DIST_DIR.rglob("*"))
        if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES
    ]

    if not files:
        raise SystemExit("frontend/dist has no text bundle files")

    bundle_text_parts: list[str] = []

    for file_path in files:
        bundle_text_parts.append(file_path.read_text(encoding="utf-8-sig"))

    bundle_text = "\n".join(bundle_text_parts)

    forbidden = [marker for marker in FORBIDDEN_MARKERS if marker in bundle_text]
    missing_visible = [
        value
        for value in REQUIRED_VISIBLE_TEXT
        if not contains_visible_text(bundle_text, value)
    ]
    missing_technical = [
        value
        for value in REQUIRED_TECHNICAL_MARKERS
        if value not in bundle_text
    ]

    if forbidden or missing_visible or missing_technical:
        print("frontend bundle encoding guard failed")

        if forbidden:
            print("forbidden markers:")
            for value in forbidden:
                print(f" - {value!r}")

        if missing_visible:
            print("missing visible text:")
            for value in missing_visible:
                print(f" - {value!r}")

        if missing_technical:
            print("missing technical markers:")
            for value in missing_technical:
                print(f" - {value!r}")

        raise SystemExit(1)

    print("frontend bundle encoding guard passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
