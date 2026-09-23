from __future__ import annotations

import asyncio

from app.db.session import AsyncSessionLocal
from app.services.mintrud_learn_programs import (
    sync_mintrud_learn_program_catalog_v109,
)


async def seed_mintrud_learn_programs() -> None:
    async with AsyncSessionLocal() as session:
        result = (
            await sync_mintrud_learn_program_catalog_v109(
                session
            )
        )

        await session.commit()

    print(
        "Mintrud learn program catalog v1.0.9 synced: "
        f"created={result.created}, "
        f"updated={result.updated}, "
        f"unchanged={result.unchanged}, "
        f"deactivated={result.deactivated}"
    )


if __name__ == "__main__":
    asyncio.run(
        seed_mintrud_learn_programs()
    )