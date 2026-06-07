from pathlib import Path

DOC = Path("docs/stage74-organization-info-public-page.md")
PAGE = Path("frontend/src/pages/OrganizationInfoPage.jsx")

DOC_REQUIRED_MARKERS = [
    "# Stage 74 - Organization info public page polish",
    "Status: implemented",
    "Scope: frontend static public page only",
    "stage74_organization_info_public_page=yes",
    "backend_changed=no",
    "database_changed=no",
    "migrations_added=no",
    "auth_changed=no",
    "rbac_changed=no",
    "production_changed=no",
]

PAGE_REQUIRED_MARKERS = [
    "organization-info-public-page",
    "organization-info-official-facts",
    "organization-info-public-contacts",
    "organization-info-documents-next-step",
    "ГБОУ РЦДО",
    "Государственное бюджетное общеобразовательное учреждение Республиканский центр дистанционного образования детей-инвалидов",
    "Министерство просвещения Республики Башкортостан",
    "Нуриев Фаниль Жамилевич",
    "0274931354",
    "Республика Башкортостан, г. Уфа, ул. Авроры, 18/2",
    "https://rcdo02.ru",
    "https://portal.rcdo02.ru",
    "+7 (347) 200 10 17",
    "rcdodist@gmail.com",
    "Пн-Пт, 09:00-18:00",
    "Непроверенные",
]

PAGE_FORBIDDEN_MARKERS = [
    "Публичная структура официального раздела образовательной организации",
    "На этом этапе мы фиксируем каркас страницы",
    "Что должно появиться на следующем проходе",
    "+7 (000) 000-00-00",
    "info@obrportal.local",
    "support@obrportal.local",
]


def read(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(path)
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    problems: list[str] = []

    try:
        doc_text = read(DOC)
    except FileNotFoundError:
        problems.append(f"Missing file: {DOC}")
        doc_text = ""

    try:
        page_text = read(PAGE)
    except FileNotFoundError:
        problems.append(f"Missing file: {PAGE}")
        page_text = ""

    for marker in DOC_REQUIRED_MARKERS:
        if marker not in doc_text:
            problems.append(f"document missing marker: {marker}")

    for marker in PAGE_REQUIRED_MARKERS:
        if marker not in page_text:
            problems.append(f"page missing marker: {marker}")

    for marker in PAGE_FORBIDDEN_MARKERS:
        if marker in page_text:
            problems.append(f"page forbidden marker still present: {marker}")

    if problems:
        print("Stage 74 organization info public page guard failed:")
        for problem in problems:
            print(f" - {problem}")
        return 1

    print("Stage 74 organization info public page guard: passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
