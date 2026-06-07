from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PUBLIC_FILES = [
    "frontend/src/pages/HomePage.jsx",
    "frontend/src/pages/ContactsPage.jsx",
    "frontend/src/pages/FaqPage.jsx",
    "frontend/src/pages/PrivacyPage.jsx",
    "frontend/src/pages/OfferPage.jsx",
    "frontend/src/pages/OrganizationInfoPage.jsx",
]

REQUIRED_MARKERS = {
    "frontend/src/pages/HomePage.jsx": [
        "Образовательный портал ГБОУ РЦДО",
        "публичная проверка подлинности документов",
        "Сведения об организации",
    ],
    "frontend/src/pages/ContactsPage.jsx": [
        "Контакты ГБОУ РЦДО",
        "+7 (347) 200 10 17",
        "rcdodist@gmail.com",
        "г. Уфа, ул. Авроры, 18/2",
        "Проверить документ",
    ],
    "frontend/src/pages/FaqPage.jsx": [
        "Частые вопросы",
        "ГБОУ РЦДО",
        "личный кабинет",
        "проверка подлинности",
        "rcdodist@gmail.com",
    ],
    "frontend/src/pages/PrivacyPage.jsx": [
        "Политика обработки персональных данных",
        "Оператор персональных данных",
        "ГБОУ РЦДО",
        "0274931354",
        "Республика Башкортостан, г. Уфа, ул. Авроры, 18/2",
        "rcdodist@gmail.com",
    ],
    "frontend/src/pages/OfferPage.jsx": [
        "Условия использования портала",
        "Портал используется для публикации образовательных программ ГБОУ РЦДО",
        "Подлинность документа",
        "+7 (347) 200 10 17",
        "rcdodist@gmail.com",
    ],
    "frontend/src/pages/OrganizationInfoPage.jsx": [
        "ГБОУ РЦДО",
        "Проверенные сведения",
        "0274931354",
        "Нуриев Фаниль Жамилевич",
        "Документы организации",
    ],
}

FORBIDDEN_PUBLIC_FRAGMENTS = [
    "+7 (000) 000-00-00",
    "info@obrportal.local",
    "support@obrportal.local",
    "Публичный каркас",
    "каркас страницы",
    "Что должно появиться на следующем проходе",
    "Следующий проход",
    "будущий корпоративный контур",
    "следующем проходе",
]

REQUIRED_MANIFEST_MARKERS = [
    '"status": "implementation_ready"',
    '"deployment_type": "frontend-only"',
    '"frontend/src/pages/FaqPage.jsx"',
    '"frontend/src/pages/PrivacyPage.jsx"',
    '"frontend/src/pages/OfferPage.jsx"',
    '"python .\\\\scripts\\\\check_stage75_public_content_polish.py"',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 75 public content guard failed: {message}")


def read(path: str) -> str:
    file_path = ROOT / path
    if not file_path.exists():
        fail(f"missing file: {path}")
    return file_path.read_text(encoding="utf-8")


def require_markers(path: str, markers: list[str]) -> None:
    text = read(path)
    missing = [marker for marker in markers if marker not in text]
    if missing:
        fail(f"missing markers in {path}: {missing}")


def reject_fragments(path: str, fragments: list[str]) -> None:
    text = read(path)
    found = [fragment for fragment in fragments if fragment in text]
    if found:
        fail(f"forbidden public fragments in {path}: {found}")


def main() -> None:
    for path in PUBLIC_FILES:
        require_markers(path, REQUIRED_MARKERS[path])
        reject_fragments(path, FORBIDDEN_PUBLIC_FRAGMENTS)

    manifest_text = read("docs/release-manifest.json")
    missing_manifest_markers = [
        marker for marker in REQUIRED_MANIFEST_MARKERS if marker not in manifest_text
    ]
    if missing_manifest_markers:
        fail(f"release manifest is missing markers: {missing_manifest_markers}")

    require_markers(
        "docs/stage75-public-portal-content-polish.md",
        [
            "Stage 75 - Public portal official content polish",
            "Status: implementation ready",
            "stage75_status=implementation_ready",
            "stage75_public_content_guard_required=yes",
        ],
    )

    print("stage 75 public content guard passed")


if __name__ == "__main__":
    main()
