from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8-sig")


def require_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"{relative_path} is missing required fragments:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/components/account/LearnerAccountSidebar.jsx",
        [
            "export const LEARNER_ACCOUNT_SECTIONS",
            'key: "overview"',
            'label: "Обзор"',
            'key: "learning"',
            'label: "Моё обучение"',
            'key: "assignments"',
            'label: "Задания и тесты"',
            'key: "documents"',
            'label: "Документы"',
            'key: "profile"',
            'label: "Профиль"',
            "buildInitials(user)",
            "getDisplayName(user)",
            'data-testid="learner-account-sidebar"',
            'aria-label="Навигация личного кабинета"',
            'aria-current={active ? "page" : undefined}',
            "onSectionChange(item.key)",
        ],
    )

    require_contains(
        "frontend/src/components/account/LearnerAccountLayout.jsx",
        [
            'import { useState } from "react";',
            'import { Menu, X } from "lucide-react";',
            "LEARNER_ACCOUNT_SECTIONS",
            "LearnerAccountSidebar",
            "export function LearnerAccountLayout",
            'activeSection = "overview"',
            "const [mobileMenuOpen, setMobileMenuOpen] = useState(false);",
            "onSectionChange(section);",
            "setMobileMenuOpen(false);",
            'data-testid="learner-account-layout"',
            'aria-expanded={mobileMenuOpen}',
            'aria-controls="learner-account-mobile-navigation"',
            'data-testid="learner-account-mobile-navigation"',
            'lg:grid-cols-[260px_minmax(0,1fr)]',
            'data-testid="learner-account-content"',
        ],
    )

    print("Learner account layout smoke passed")
    print(" - desktop sidebar contract covered")
    print(" - mobile navigation contract covered")
    print(" - learner account section map covered")


if __name__ == "__main__":
    main()
