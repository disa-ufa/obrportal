from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.organization import Organization  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.role import Permission, Role, RolePermission


ROLES = [
    {
        "code": "admin",
        "name": "Администратор системы",
        "description": "Полный системный доступ к платформе.",
    },
    {
        "code": "learner_fl",
        "name": "Физическое лицо",
        "description": "Частный слушатель: обучение, документы, заказы и оплаты.",
    },
    {
        "code": "learner_org",
        "name": "Слушатель от ЮЛ",
        "description": "Корпоративный слушатель с доступом к назначенным курсам.",
    },
    {
        "code": "org_rep",
        "name": "Представитель ЮЛ",
        "description": "Корпоративный заказчик: организация, договоры, группы обучающихся.",
    },
    {
        "code": "ministry_admin",
        "name": "Администратор ведомства",
        "description": "Просмотр профилей закреплённых подведомственных организаций.",
    },
    {
        "code": "teacher",
        "name": "Преподаватель / куратор",
        "description": "Проверка заданий, аттестаций и сопровождение обучения.",
    },
    {
        "code": "methodist",
        "name": "Методист / контент-менеджер",
        "description": "Создание и публикация курсов, уроков, тестов и шаблонов.",
    },
    {
        "code": "finance_operator",
        "name": "Финансовый оператор",
        "description": "Платежи, возвраты, чеки и финансовая сверка.",
    },
    {
        "code": "edo_operator",
        "name": "Оператор ЭДО",
        "description": "Подготовка, отправка и контроль юридически значимых документов.",
    },
    {
        "code": "frdo_operator",
        "name": "Оператор ФРДО",
        "description": "Staging, валидация, экспорт и контроль сведений ФИС ФРДО.",
    },
]


PERMISSIONS = [
    ("system.health.read", "Просмотр состояния системы"),
    ("admin.users.read", "Просмотр пользователей"),
    ("admin.users.write", "Управление пользователями"),
    ("admin.roles.read", "Просмотр ролей и прав"),
    ("admin.roles.write", "Управление ролями и правами"),
    ("admin.organizations.read", "Просмотр организаций"),
    ("admin.organizations.write", "Управление организациями"),
    ("admin.settings.read", "Просмотр настроек платформы"),
    ("admin.settings.write", "Управление настройками платформы"),

    ("audit.read", "Просмотр журнала аудита"),

    ("catalog.read", "Просмотр каталога курсов"),
    ("catalog.write", "Управление каталогом курсов"),

    ("learning.read", "Просмотр обучения"),
    ("learning.write", "Управление учебным процессом"),
    ("learning.progress.read", "Просмотр прогресса обучения"),
    ("learning.progress.write", "Изменение прогресса обучения"),

    ("tests.read", "Просмотр тестов и аттестаций"),
    ("tests.write", "Управление тестами и аттестациями"),
    ("tests.review", "Проверка работ и попыток"),

    ("documents.read", "Просмотр документов"),
    ("documents.write", "Управление документами"),
    ("documents.generate", "Генерация документов"),

    ("orders.read", "Просмотр заказов"),
    ("orders.write", "Управление заказами"),

    ("payments.read", "Просмотр платежей"),
    ("payments.write", "Управление платежами"),
    ("payments.refund", "Возвраты платежей"),

    ("org.profile.read", "Просмотр профиля организации"),
    ("org.profile.write", "Управление профилем организации"),
    ("org.groups.read", "Просмотр групп обучающихся"),
    ("org.groups.write", "Управление группами обучающихся"),
    ("org.import.write", "Импорт сотрудников"),

    ("edo.read", "Просмотр ЭДО"),
    ("edo.write", "Подготовка документов ЭДО"),
    ("edo.send", "Отправка документов в ЭДО"),
    ("edo.annul", "Аннулирование документов ЭДО"),

    ("frdo.read", "Просмотр ФРДО"),
    ("frdo.write", "Подготовка записей ФРДО"),
    ("frdo.validate", "Валидация записей ФРДО"),
    ("frdo.approve", "Утверждение записей ФРДО"),
    ("frdo.export", "Экспорт / отправка сведений ФРДО"),

    ("files.read", "Чтение файлов"),
    ("files.write", "Загрузка файлов"),
]


ROLE_PERMISSION_MAP = {
    "admin": "*",

    "learner_fl": [
        "catalog.read",
        "learning.read",
        "learning.progress.read",
        "tests.read",
        "documents.read",
        "orders.read",
        "orders.write",
        "payments.read",
        "files.read",
    ],

    "learner_org": [
        "learning.read",
        "learning.progress.read",
        "tests.read",
        "documents.read",
        "files.read",
    ],

    "org_rep": [
        "catalog.read",
        "org.profile.read",
        "org.profile.write",
        "org.groups.read",
        "org.groups.write",
        "org.import.write",
        "orders.read",
        "orders.write",
        "documents.read",
        "edo.read",
        "learning.progress.read",
        "files.read",
        "files.write",
    ],

    "ministry_admin": [
        "org.profile.read",
    ],

    "teacher": [
        "learning.read",
        "learning.progress.read",
        "tests.read",
        "tests.review",
        "files.read",
    ],

    "methodist": [
        "catalog.read",
        "catalog.write",
        "learning.read",
        "learning.write",
        "tests.read",
        "tests.write",
        "documents.read",
        "documents.write",
        "files.read",
        "files.write",
    ],

    "finance_operator": [
        "orders.read",
        "payments.read",
        "payments.write",
        "payments.refund",
        "audit.read",
    ],

    "edo_operator": [
        "documents.read",
        "documents.write",
        "documents.generate",
        "edo.read",
        "edo.write",
        "edo.send",
        "edo.annul",
        "org.profile.read",
        "audit.read",
        "files.read",
        "files.write",
    ],

    "frdo_operator": [
        "documents.read",
        "frdo.read",
        "frdo.write",
        "frdo.validate",
        "frdo.approve",
        "frdo.export",
        "audit.read",
        "files.read",
        "files.write",
    ],
}


async def get_or_create_role(session, item: dict) -> Role:
    result = await session.execute(select(Role).where(Role.code == item["code"]))
    role = result.scalar_one_or_none()

    if role:
        role.name = item["name"]
        role.description = item["description"]
        return role

    role = Role(
        code=item["code"],
        name=item["name"],
        description=item["description"],
    )
    session.add(role)
    await session.flush()
    return role


async def get_or_create_permission(session, code: str, name: str) -> Permission:
    result = await session.execute(select(Permission).where(Permission.code == code))
    permission = result.scalar_one_or_none()

    if permission:
        permission.name = name
        return permission

    permission = Permission(code=code, name=name)
    session.add(permission)
    await session.flush()
    return permission


async def ensure_role_permission(session, role: Role, permission: Permission) -> None:
    result = await session.execute(
        select(RolePermission).where(
            RolePermission.role_id == role.id,
            RolePermission.permission_id == permission.id,
        )
    )
    exists = result.scalar_one_or_none()

    if exists:
        return

    session.add(
        RolePermission(
            role_id=role.id,
            permission_id=permission.id,
        )
    )


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        roles_by_code: dict[str, Role] = {}
        permissions_by_code: dict[str, Permission] = {}

        for item in ROLES:
            role = await get_or_create_role(session, item)
            roles_by_code[role.code] = role

        for code, name in PERMISSIONS:
            permission = await get_or_create_permission(session, code, name)
            permissions_by_code[permission.code] = permission

        for role_code, permission_codes in ROLE_PERMISSION_MAP.items():
            role = roles_by_code[role_code]

            if permission_codes == "*":
                selected_permissions = list(permissions_by_code.values())
            else:
                selected_permissions = [
                    permissions_by_code[permission_code]
                    for permission_code in permission_codes
                ]

            for permission in selected_permissions:
                await ensure_role_permission(session, role, permission)

        await session.commit()

    print("Seed completed: roles, permissions and role-permission links are ready.")


if __name__ == "__main__":
    asyncio.run(seed())
