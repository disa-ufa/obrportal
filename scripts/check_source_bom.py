from pathlib import Path


ROOTS = [
    Path("backend/app"),
    Path("frontend/src"),
    Path("scripts"),
    Path(".github/workflows"),
]

TEXT_SUFFIXES = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".css",
    ".html",
    ".json",
    ".yml",
    ".yaml",
    ".md",
}

SPECIAL_NAMES = {".env.example"}


def is_text_candidate(path: Path) -> bool:
    return path.name in SPECIAL_NAMES or path.suffix.lower() in TEXT_SUFFIXES


bad_files: list[str] = []

for root in ROOTS:
    if not root.exists():
        continue

    for path in root.rglob("*"):
        if not path.is_file() or not is_text_candidate(path):
            continue

        data = path.read_bytes()

        if b"\xef\xbb\xbf" in data:
            bad_files.append(str(path))

if bad_files:
    print("BOM markers found in source files:")
    for path in bad_files:
        print(f" - {path}")
    raise SystemExit(1)

print("source BOM guard passed")