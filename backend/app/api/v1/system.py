import boto3
import redis.asyncio as redis
from botocore.config import Config
from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.schemas.system import ReadinessResponse

router = APIRouter()


@router.get("/ready", response_model=ReadinessResponse)
async def ready() -> ReadinessResponse:
    database_status = "ok"
    redis_status = "ok"
    storage_status = "ok"

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        database_status = f"error: {type(exc).__name__}"

    try:
        client = redis.from_url(settings.redis_url)
        await client.ping()
        await client.aclose()
    except Exception as exc:  # noqa: BLE001
        redis_status = f"error: {type(exc).__name__}"

    try:
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=Config(signature_version="s3v4"),
        )
        s3.list_buckets()
    except Exception as exc:  # noqa: BLE001
        storage_status = f"error: {type(exc).__name__}"

    overall = "ok" if all(x == "ok" for x in [database_status, redis_status, storage_status]) else "degraded"
    return ReadinessResponse(status=overall, database=database_status, redis=redis_status, storage=storage_status)
