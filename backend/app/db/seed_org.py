from __future__ import annotations

import asyncio
import os

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.organization import Organization


def get_env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)

    if value is None or value.strip() == "":
        return default

    return value.strip()


async def seed_org() -> None:
    inn = get_env("SEED_ORG_INN", "0278000001")
    kpp = get_env("SEED_ORG_KPP", "027801001")
    ogrn = get_env("SEED_ORG_OGRN", "1020200000001")
    name = get_env("SEED_ORG_NAME", "GBOU RCDO")
    legal_address = get_env("SEED_ORG_LEGAL_ADDRESS", "Republic of Bashkortostan, Ufa")
    actual_address = get_env("SEED_ORG_ACTUAL_ADDRESS", "Republic of Bashkortostan, Ufa")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Organization).where(Organization.inn == inn)
        )
        organization = result.scalar_one_or_none()

        if organization:
            organization.kpp = kpp
            organization.ogrn = ogrn
            organization.name = name
            organization.legal_address = legal_address
            organization.actual_address = actual_address
        else:
            organization = Organization(
                inn=inn,
                kpp=kpp,
                ogrn=ogrn,
                name=name,
                legal_address=legal_address,
                actual_address=actual_address,
            )
            session.add(organization)

        await session.commit()

    print(f"Organization is ready: {inn} / {name}")


if __name__ == "__main__":
    asyncio.run(seed_org())
