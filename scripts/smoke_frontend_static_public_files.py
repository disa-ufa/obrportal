from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def require_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"{relative_path} is missing required fragments:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)


def require_any(relative_path: str, variants: list[str], label: str) -> None:
    text = read_text(relative_path)

    if not any(variant in text for variant in variants):
        print(f"{relative_path} is missing any accepted fragment for {label}:")
        for variant in variants:
            print(f" - {variant}")
        raise SystemExit(1)


def require_no_forbidden_text(relative_path: str) -> None:
    text = read_text(relative_path)
    forbidden = [
        "\ufeff",
        "\u0420\u045f",
        "\u0420\u0452",
        "\u0420\u040e",
        "\u0420\u045c",
        "\u0421\u040a",
        "\u0421\u0403",
        "\u0432\u0402",
        "\u00c2",
    ]

    found = [fragment for fragment in forbidden if fragment in text]

    if found:
        print(f"{relative_path} contains forbidden mojibake/BOM fragments:")
        for fragment in found:
            print(f" - {fragment}")
        raise SystemExit(1)


def require_static_page(relative_path: str, component_name: str) -> None:
    require_contains(
        relative_path,
        [
            f"export function {component_name}(",
            "return (",
        ],
    )
    require_no_forbidden_text(relative_path)


def main() -> None:
    require_static_page(
        "frontend/src/pages/AdminNotFoundPage.jsx",
        "AdminNotFoundPage",
    )

    require_static_page(
        "frontend/src/pages/ContactsPage.jsx",
        "ContactsPage",
    )

    require_static_page(
        "frontend/src/pages/FaqPage.jsx",
        "FaqPage",
    )

    require_static_page(
        "frontend/src/pages/NotFoundPage.jsx",
        "NotFoundPage",
    )

    require_static_page(
        "frontend/src/pages/OfferPage.jsx",
        "OfferPage",
    )

    require_static_page(
        "frontend/src/pages/OrganizationInfoPage.jsx",
        "OrganizationInfoPage",
    )

    require_static_page(
        "frontend/src/pages/PrivacyPage.jsx",
        "PrivacyPage",
    )

    require_any(
        "frontend/src/components/ObrPortalStage5DesignVariants.jsx",
        [
            "export function ObrPortalStage5DesignVariants(",
            "export default function ObrPortalStage5DesignVariants(",
            "function ObrPortalStage5DesignVariants(",
            "const ObrPortalStage5DesignVariants =",
            "export const ObrPortalStage5DesignVariants =",
        ],
        "stage 5 design variants component",
    )
    require_contains(
        "frontend/src/components/ObrPortalStage5DesignVariants.jsx",
        [
            "return (",
        ],
    )
    require_no_forbidden_text("frontend/src/components/ObrPortalStage5DesignVariants.jsx")

    require_any(
        "frontend/src/data/publicCourses.js",
        [
            "export const publicCourses",
            "export const PUBLIC_COURSES",
            "export default",
        ],
        "public courses export",
    )
    require_no_forbidden_text("frontend/src/data/publicCourses.js")


    print("Frontend static/public files behavior smoke passed")


if __name__ == "__main__":
    main()
