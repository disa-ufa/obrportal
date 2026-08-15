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
            "getRoleLabel(user)",
            'role?.code === "learner_fl"',
            'role?.code === "learner_org"',
            'return "Слушатель";',
            "{getRoleLabel(user)}",
            'data-testid="learner-account-sidebar"',
            'aria-label="Навигация личного кабинета"',
            'aria-current={active ? "page" : undefined}',
            "focus-visible:ring-4",
            "onSectionChange(item.key)",
        ],
    )

    require_contains(
        "frontend/src/components/account/LearnerAccountLayout.jsx",
        [
            'import { useEffect, useRef, useState } from "react";',
            'import { Menu, X } from "lucide-react";',
            "LEARNER_ACCOUNT_SECTIONS",
            "LearnerAccountSidebar",
            "export function LearnerAccountLayout",
            'activeSection = "overview"',
            "const [mobileMenuOpen, setMobileMenuOpen] = useState(false);",
            "const mobileToggleRef = useRef(null);",
            'event.key !== "Escape"',
            'document.addEventListener("keydown", handleKeyDown);',
            'document.removeEventListener("keydown", handleKeyDown);',
            "mobileToggleRef.current?.focus();",
            "ref={mobileToggleRef}",
            "focus-visible:ring-4",
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

    require_contains(
        "frontend/src/pages/AccountPage.jsx",
        [
            'import { LearnerAccountLayout } from "../components/account/LearnerAccountLayout";',
            "const ACCOUNT_SECTION_TARGETS = {",
            'overview: "account-overview"',
            'learning: "account-learning"',
            'assignments: "account-assignments"',
            'documents: "account-documents"',
            'profile: "account-profile"',
            'id="account-profile"',
            "const [activeAccountSection, setActiveAccountSection] = useState(",
            "getInitialAccountSection",
            "function handleAccountSectionChange(section)",
            "setActiveAccountSection(section);",
            "const targetId = ACCOUNT_SECTION_TARGETS[section];",
            "window.requestAnimationFrame(() => {",
            "document.getElementById(targetId)?.scrollIntoView({",
            'behavior: "smooth"',
            "<LearnerAccountLayout",
            "user={profile}",
            "activeSection={activeAccountSection}",
            "onSectionChange={handleAccountSectionChange}",
            'id="account-overview"',
            'id="account-learning"',
            'id="account-assignments"',
            'id="account-documents"',
        ],
    )

    require_contains(
        "frontend/src/components/account/AccountLearnerProfileCard.jsx",
        [
            'id="account-learner-profile"',
        ],
    )

    print("Learner account layout smoke passed")
    print(" - desktop sidebar contract covered")
    print(" - mobile navigation contract covered")
    print(" - learner account section map covered")


if __name__ == "__main__":
    main()
