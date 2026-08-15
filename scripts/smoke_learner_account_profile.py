from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

COMPONENT = (
    ROOT
    / "frontend"
    / "src"
    / "components"
    / "account"
    / "LearnerAccountProfile.jsx"
)

PROFILE_CARD = (
    ROOT
    / "frontend"
    / "src"
    / "components"
    / "account"
    / "AccountLearnerProfileCard.jsx"
)
ACCOUNT_PAGE = (
    ROOT
    / "frontend"
    / "src"
    / "pages"
    / "AccountPage.jsx"
)


def require_contains(text: str, fragment: str, label: str) -> None:
    if fragment not in text:
        raise SystemExit(
            f"Missing {label}: {fragment!r}"
        )


component = COMPONENT.read_text(encoding="utf-8")
profile_card = PROFILE_CARD.read_text(encoding="utf-8")
account_page = ACCOUNT_PAGE.read_text(encoding="utf-8")

for fragment, label in [
    (
        'export function LearnerAccountProfile',
        "workspace export",
    ),
    (
        'data-testid="learner-account-profile-workspace"',
        "workspace test id",
    ),
    (
        "Мой профиль",
        "profile page title",
    ),
    (
        "Персональные и контактные данные",
        "profile page description",
    ),
    (
        'data-testid="learner-profile-account-summary"',
        "account summary",
    ),
    (
        "Учётная запись",
        "account identity",
    ),
    (
        "E-mail для входа",
        "login email",
    ),
    (
        "<AccountLearnerProfileCard",
        "existing profile form reuse",
    ),
]:
    require_contains(
        component,
        fragment,
        label,
    )

for fragment, label in [
    (
        "getAccountLearnerProfile",
        "profile GET client usage",
    ),
    (
        "updateAccountLearnerProfile",
        "profile PATCH client usage",
    ),
    (
        'data-testid="account-learner-profile"',
        "profile form test id",
    ),
    (
        "Получатель документа",
        "recipient fields",
    ),
    (
        "Контакты для документов",
        "contact fields",
    ),
    (
        "Документ, удостоверяющий личность",
        "identity document fields",
    ),
    (
        "Проверка документа личности",
        "identity verification state",
    ),
    (
        "Проверка документа об образовании",
        "education verification state",
    ),
    (
        "Сохранить данные",
        "save action",
    ),
]:
    require_contains(
        profile_card,
        fragment,
        label,
    )


for fragment, label in [
    (
        'import { LearnerAccountProfile } from "../components/account/LearnerAccountProfile";',
        "workspace AccountPage import",
    ),
    (
        'profile: "account-profile"',
        "profile section target",
    ),
    (
        'id="account-profile"',
        "standalone profile section",
    ),
    (
        'activeAccountSection === "profile"',
        "profile visibility condition",
    ),
    (
        "<LearnerAccountProfile",
        "profile workspace mount",
    ),
    (
        'accountUser={profile}',
        "profile account data",
    ),
]:
    require_contains(
        account_page,
        fragment,
        label,
    )

if (
    'import { AccountLearnerProfileCard } from "../components/account/AccountLearnerProfileCard";'
    in account_page
):
    raise SystemExit(
        "Legacy AccountLearnerProfileCard import still exists in AccountPage"
    )

if "<AccountLearnerProfileCard" in account_page:
    raise SystemExit(
        "Legacy AccountLearnerProfileCard mount still exists in AccountPage"
    )
print("Learner account profile smoke passed")
print(" - standalone profile workspace covered")
print(" - account identity summary covered")
print(" - existing profile API form reused")
print(" - personal/contact/document fields preserved")
print(" - verification statuses preserved")
