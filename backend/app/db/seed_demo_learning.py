from __future__ import annotations

import asyncio
import os

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.course import Course
from app.models.learning_group import LearningGroup, LearningGroupMember
from app.models.organization import Organization
from app.models.user import User


def get_env(name: str, default: str) -> str:
    value = os.getenv(name)

    if value is None or value.strip() == "":
        return default

    return value.strip()


async def get_required_organization(session) -> Organization:
    inn = get_env("SEED_ORG_INN", "0278000001")

    result = await session.execute(
        select(Organization).where(Organization.inn == inn)
    )
    organization = result.scalar_one_or_none()

    if organization is None:
        raise RuntimeError(
            f"Organization with INN '{inn}' not found. "
            "Run python -m app.db.seed_org first."
        )

    return organization


async def get_required_learner(session) -> User:
    email = get_env("SEED_DEMO_EMAIL", "learner@obrportal.local").lower()

    result = await session.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise RuntimeError(
            f"Learner user '{email}' not found. "
            "Run python -m app.db.seed_demo_user first."
        )

    return user


async def get_or_create_demo_course(session) -> Course:
    slug = get_env("SEED_DEMO_COURSE_SLUG", "demo-course")

    result = await session.execute(
        select(Course).where(Course.slug == slug)
    )
    course = result.scalar_one_or_none()

    data = {
        "slug": slug,
        "title": get_env("SEED_DEMO_COURSE_TITLE", "Demo Course"),
        "description": get_env(
            "SEED_DEMO_COURSE_DESCRIPTION",
            "Demo course for local UX testing.",
        ),
        "hours": int(get_env("SEED_DEMO_COURSE_HOURS", "72")),
        "format": get_env("SEED_DEMO_COURSE_FORMAT", "online"),
        "document_type": get_env(
            "SEED_DEMO_COURSE_DOCUMENT_TYPE",
            "certificate",
        ),
        "is_public": True,
        "is_active": True,
    }

    if course:
        course.title = data["title"]
        course.description = data["description"]
        course.hours = data["hours"]
        course.format = data["format"]
        course.document_type = data["document_type"]
        course.is_public = data["is_public"]
        course.is_active = data["is_active"]
        return course

    course = Course(**data)
    session.add(course)
    await session.flush()

    return course


async def get_or_create_demo_group(
    session,
    organization: Organization,
) -> LearningGroup:
    code = get_env("SEED_DEMO_GROUP_CODE", "DEMO-GROUP")

    result = await session.execute(
        select(LearningGroup).where(
            LearningGroup.organization_id == organization.id,
            LearningGroup.code == code,
        )
    )
    group = result.scalar_one_or_none()

    if group:
        group.name = get_env("SEED_DEMO_GROUP_NAME", "Demo Group")
        group.description = get_env(
            "SEED_DEMO_GROUP_DESCRIPTION",
            "Demo learning group for local UX testing.",
        )
        group.is_active = True
        return group

    group = LearningGroup(
        organization_id=organization.id,
        name=get_env("SEED_DEMO_GROUP_NAME", "Demo Group"),
        code=code,
        description=get_env(
            "SEED_DEMO_GROUP_DESCRIPTION",
            "Demo learning group for local UX testing.",
        ),
        is_active=True,
    )
    session.add(group)
    await session.flush()

    return group


async def ensure_group_member(
    session,
    group: LearningGroup,
    learner: User,
) -> None:
    result = await session.execute(
        select(LearningGroupMember).where(
            LearningGroupMember.learning_group_id == group.id,
            LearningGroupMember.user_id == learner.id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        return

    session.add(
        LearningGroupMember(
            learning_group_id=group.id,
            user_id=learner.id,
        )
    )


async def seed_demo_learning() -> None:
    async with AsyncSessionLocal() as session:
        organization = await get_required_organization(session)
        learner = await get_required_learner(session)
        course = await get_or_create_demo_course(session)
        group = await get_or_create_demo_group(session, organization)

        await ensure_group_member(session, group, learner)

        await session.commit()

    print(
        "Demo learning data is ready: "
        f"course={course.slug}, group={group.code}, learner={learner.email}"
    )


if __name__ == "__main__":
    asyncio.run(seed_demo_learning())
