from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PUBLIC_SHELL = ROOT / "frontend" / "src" / "components" / "layout" / "PublicShell.jsx"
ADMIN_SHELL = ROOT / "frontend" / "src" / "components" / "layout" / "AppShell.jsx"
PUBLIC_ROUTES = ROOT / "frontend" / "src" / "utils" / "publicRoutes.js"
STAGE_DOC = ROOT / "docs" / "stage75-public-ui-cleanup.md"


def fail(message: str) -> None:
    raise SystemExit(f"stage 75.1 public UI cleanup guard failed: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def require_contains(path: Path, fragments: list[str]) -> None:
    text = read(path)
    missing = [fragment for fragment in fragments if fragment not in text]
    if missing:
        fail(f"{path.relative_to(ROOT)} missing fragments: {missing}")


def require_absent(path: Path, fragments: list[str]) -> None:
    text = read(path)
    found = [fragment for fragment in fragments if fragment in text]
    if found:
        fail(f"{path.relative_to(ROOT)} contains forbidden fragments: {found}")


def main() -> None:
    require_contains(
        PUBLIC_SHELL,
        [
            '{ key: "offer", label: "Условия использования" }',
            "ГБОУ РЦДО",
            "Образовательный портал",
        ],
    )
    require_absent(
        PUBLIC_SHELL,
        [
            "ObrPortal · Stage 7",
            '{ key: "offer", label: "Оферта" }',
            "Публичный контур",
        ],
    )

    require_contains(ADMIN_SHELL, ["Административный контур", "Административная панель"])
    require_absent(ADMIN_SHELL, ["ObrPortal · Stage 6"])

    require_contains(
        PUBLIC_ROUTES,
        [
            'title: "Условия использования портала — ObrPortal"',
            "Публичные условия использования образовательного портала",
            '{ pathname: "/offer", expectedPage: "offer", expectedTitle: "Условия использования портала — ObrPortal" }',
        ],
    )
    require_absent(
        PUBLIC_ROUTES,
        [
            'title: "Оферта — ObrPortal"',
            "Публичная оферта образовательной платформы",
        ],
    )

    require_contains(
        STAGE_DOC,
        [
            "Stage 75.1 - Public UI technical labels cleanup",
            "stage75_1_status=implementation_ready",
            "Stage 75 is deployed on production at `e0049ab`",
            "Frontend-only deploy after merge to `develop`",
        ],
    )

    print("stage 75.1 public UI cleanup guard passed")


if __name__ == "__main__":
    main()
