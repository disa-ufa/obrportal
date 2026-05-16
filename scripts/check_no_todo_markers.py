from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SELF = Path(__file__).resolve()

SCAN_DIRS = [
    ROOT / "backend" / "app",
    ROOT / "frontend" / "src",
    ROOT / "scripts",
]

EXCLUDE_PARTS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    "dist",
    "build",
}

SUFFIXES = {".py", ".js", ".jsx", ".ts", ".tsx", ".yml", ".yaml", ".ps1", ".md"}

PATTERNS = [
    re.compile(r"\bTODO\b", re.IGNORECASE),
    re.compile(r"\bFIXME\b", re.IGNORECASE),
    re.compile(r"\bXXX\b", re.IGNORECASE),
    re.compile(r"\bHACK\b", re.IGNORECASE),
    re.compile(r"\bNotImplemented(?:Error)?\b"),
    re.compile(r"\bstub\b", re.IGNORECASE),
    re.compile(r"заглушк", re.IGNORECASE),
    re.compile(r"не\s+реализован", re.IGNORECASE),
    re.compile(r"not\s+implemented", re.IGNORECASE),
]


def should_skip(path: Path) -> bool:
    if any(part in EXCLUDE_PARTS for part in path.parts):
        return True

    if path.suffix not in SUFFIXES:
        return True

    return False


def main() -> None:
    matches: list[tuple[str, int, str]] = []

    for base in SCAN_DIRS:
        if not base.exists():
            continue

        for path in sorted(base.rglob("*"), key=lambda item: item.as_posix().lower()):
            if not path.is_file() or should_skip(path):
                continue

            if path.resolve() == SELF:
                continue

            text = path.read_text(encoding="utf-8", errors="ignore")
            lines = text.splitlines()

            for line_no, line in enumerate(lines, start=1):
                if any(pattern.search(line) for pattern in PATTERNS):
                    matches.append((path.relative_to(ROOT).as_posix(), line_no, line.strip()))

    if matches:
        print("Forbidden TODO/stub/not-implemented markers found:")
        for file_path, line_no, line in matches:
            print(f" - {file_path}:{line_no}: {line}")

        raise SystemExit(1)

    print("no TODO/stub/not-implemented markers guard passed")


if __name__ == "__main__":
    main()
