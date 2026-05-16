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


def require_occurs(relative_path: str, fragment: str, minimum: int) -> None:
    text = read_text(relative_path)
    count = text.count(fragment)

    if count < minimum:
        print(f"{relative_path} has too few occurrences of required fragment:")
        print(f" - fragment: {fragment}")
        print(f" - expected at least: {minimum}")
        print(f" - actual: {count}")
        raise SystemExit(1)


def require_used(component_name: str, minimum: int = 2) -> None:
    frontend_root = ROOT / "frontend" / "src"
    count = 0
    refs = []

    for path in frontend_root.rglob("*.jsx"):
        text = path.read_text(encoding="utf-8")
        local_count = text.count(component_name)

        if local_count:
            count += local_count
            refs.append(str(path.relative_to(ROOT)).replace("\\", "/"))

    if count < minimum:
        print(f"{component_name} has too few frontend references:")
        print(f" - expected at least: {minimum}")
        print(f" - actual: {count}")
        print(" - refs:")
        for ref in refs:
            print(f"   {ref}")
        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/components/ui/ActionButton.jsx",
        [
            "export function ActionButton",
            "children",
            "disabled",
            "type",
            "tone",
            "className",
        ],
    )

    require_contains(
        "frontend/src/components/ui/Alert.jsx",
        [
            "export function Alert",
            "title",
            "children",
            "tone",
            "red",
        ],
    )

    require_contains(
        "frontend/src/components/ui/LoadingBlock.jsx",
        [
            "export function LoadingBlock",
            "text",
        ],
    )

    require_contains(
        "frontend/src/components/ui/SectionCard.jsx",
        [
            "export function SectionCard",
            "title",
            "subtitle",
            "children",
            "action",
        ],
    )

    require_contains(
        "frontend/src/components/ui/SmallTable.jsx",
        [
            "export function SmallTable",
            "rows",
            "columns",
            "emptyText",
            "selectedRowId",
            "minWidth",
            "render",
        ],
    )

    require_contains(
        "frontend/src/components/ui/StatusBadge.jsx",
        [
            "export function StatusBadge",
            "children",
            "tone",
            "blue",
            "green",
            "red",
            "gray",
        ],
    )

    require_contains(
        "frontend/src/components/ui/DetailField.jsx",
        [
            "export function DetailField",
            "export function formatDetailDate",
            "label",
            "value",
        ],
    )

    require_contains(
        "frontend/src/components/ui/JsonBlock.jsx",
        [
            "export function JsonBlock",
            "JSON.stringify",
            "value",
        ],
    )

    require_used("ActionButton", 10)
    require_used("Alert", 10)
    require_used("LoadingBlock", 8)
    require_used("SectionCard", 10)
    require_used("SmallTable", 8)
    require_used("StatusBadge", 8)
    require_used("DetailField", 6)
    require_used("JsonBlock", 1)

    require_occurs("frontend/src/components/ui/ActionButton.jsx", "tone", 2)
    require_occurs("frontend/src/components/ui/StatusBadge.jsx", "tone", 2)
    require_occurs("frontend/src/components/ui/SmallTable.jsx", "columns", 2)

    print("Frontend UI primitives behavior smoke passed")


if __name__ == "__main__":
    main()
