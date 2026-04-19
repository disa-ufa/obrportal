from __future__ import annotations

import asyncio
import os

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.organization import Organization


DEMO_ORG_INN = os.getenv("SEED_DEMO_ORG_INN", "0278000000")
DEMO_ORG_KPP = os.getenv("SEED_DEMO_ORG_KPP", "027801001")
DEMO_ORG_OGRN = os.getenv("SEED_DEMO_ORG_OGRN", "1020200000000")
DEMO_ORG_NAME = os.getenv("SEED_DEMO_ORG_NAME", "Демо организация ObrPortal")
DEMO_ORG_LEGAL_ADDRESS = os.getenv(
    "SEED_DEMO_ORG_LEGAL_ADDRESS",
    "450000, Республика Башкортостан, г. Уфа, ул. Демонстрационная, д. 1",
)
DEMO_ORG_ACTUAL_ADDRESS = os.getenv(
    "SEED_DEMO_ORG_ACTUAL_ADDRESS",
    DEMO_ORG_LEGAL_ADDRESS,
)


async def seed_demo_organization() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Organization).where(Organization.inn == DEMO_ORG_INN)
        )
        organization = result.scalar_one_or_none()

        if organization is None:
            organization = Organization(
                inn=DEMO_ORG_INN,
                kpp=DEMO_ORG_KPP,
                ogrn=DEMO_ORG_OGRN,
                name=DEMO_ORG_NAME,
                legal_address=DEMO_ORG_LEGAL_ADDRESS,
                actual_address=DEMO_ORG_ACTUAL_ADDRESS,
            )
            session.add(organization)
        else:
            organization.kpp = DEMO_ORG_KPP
            organization.ogrn = DEMO_ORG_OGRN
            organization.name = DEMO_ORG_NAME
            organization.legal_address = DEMO_ORG_LEGAL_ADDRESS
            organization.actual_address = DEMO_ORG_ACTUAL_ADDRESS

        await session.commit()

    print(f"Demo organization is ready: {DEMO_ORG_NAME} / INN={DEMO_ORG_INN}")


if __name__ == "__main__":
    asyncio.run(seed_demo_organization())
