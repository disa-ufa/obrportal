from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = ROOT / "frontend" / "src"
SCRIPTS_ROOT = ROOT / "scripts"

FRONTEND_SUFFIXES = {".js", ".jsx"}

ALLOW_UNCOVERED = {
    # Keep this list empty by default.
    # Add explicit exceptions only for generated/vendor files if they appear later.
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def collect_frontend_files() -> list[Path]:
    return sorted(
        [
            path
            for path in FRONTEND_ROOT.rglob("*")
            if path.is_file() and path.suffix in FRONTEND_SUFFIXES
        ],
        key=lambda path: path.as_posix().lower(),
    )


def collect_check_scripts_text() -> str:
    script_files = sorted(
        [
            path
            for path in SCRIPTS_ROOT.rglob("*.py")
            if path.is_file()
        ],
        key=lambda path: path.as_posix().lower(),
    )

    return "\n".join(read_text(path) for path in script_files)


def is_likely_covered(path: Path, script_text: str) -> bool:
    relative_path = path.relative_to(ROOT).as_posix()
    filename = path.name

    return relative_path in script_text or filename in script_text


def main() -> None:
    script_text = collect_check_scripts_text()

    uncovered = []
    for path in collect_frontend_files():
        relative_path = path.relative_to(ROOT).as_posix()

        if relative_path in ALLOW_UNCOVERED:
            continue

        if not is_likely_covered(path, script_text):
            uncovered.append(relative_path)

    if uncovered:
        print("Frontend files without likely smoke/check coverage:")
        for item in uncovered:
            print(f" - {item}")

        raise SystemExit(1)

    print("frontend smoke/check coverage guard passed")


if __name__ == "__main__":
    main()
