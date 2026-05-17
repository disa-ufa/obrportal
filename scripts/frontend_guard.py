from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = ROOT / "frontend" / "src"

CHECK_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx"}

EXCLUDED_DIRS = {
    "node_modules",
    "dist",
    "build",
    "__pycache__",
}

FORBIDDEN_PATTERNS = [
    (
        "mojibake_question_marks",
        re.compile(r"\?{3,}"),
        "Найдена повреждённая строка вида ?????. Исправьте кодировку/текст.",
    ),
    (
        "window_prompt",
        re.compile(r"\bwindow\.prompt\s*\("),
        "Не используйте window.prompt в UI. Сделайте inline-форму/модалку.",
    ),
    (
        "window_alert",
        re.compile(r"\bwindow\.alert\s*\("),
        "Не используйте window.alert в UI. Используйте Alert/toast/inline-сообщение.",
    ),
    (
        "raw_err_status_message_template",
        re.compile(r"\$\{err\.status\s*\|\|\s*['\"]{2}\}\s*\$\{err\.message\}"),
        "Найден сырой вывод ошибки API. Используйте getApiErrorMessage()/format*ApiError().",
    ),
]


def should_skip(path: Path) -> bool:
    relative_parts = set(path.relative_to(ROOT).parts)

    if relative_parts & EXCLUDED_DIRS:
        return True

    if path.suffix.lower() not in CHECK_EXTENSIONS:
        return True

    return False


def iter_frontend_files() -> list[Path]:
    if not FRONTEND_ROOT.exists():
        return []

    return [
        path
        for path in FRONTEND_ROOT.rglob("*")
        if path.is_file() and not should_skip(path)
    ]


def scan_file(path: Path) -> list[str]:
    findings: list[str] = []

    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError as exc:
        return [f"{path.relative_to(ROOT)}: failed to read file: {exc}"]

    for line_number, line in enumerate(lines, start=1):
        for name, pattern, message in FORBIDDEN_PATTERNS:
            if pattern.search(line):
                findings.append(
                    f"{path.relative_to(ROOT)}:{line_number}: {name}: {message}"
                )

    return findings


def main() -> int:
    findings: list[str] = []

    for path in iter_frontend_files():
        findings.extend(scan_file(path))

    if findings:
        print("Frontend guard failed:")
        for finding in findings:
            print(f" - {finding}")
        return 1

    print("Frontend guard passed. No forbidden frontend patterns found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
