from redis.asyncio import Redis

from app.core.redis import get_redis_client, redis_client


def test_get_redis_client_returns_configured_singleton() -> None:
    client = get_redis_client()

    assert client is redis_client
    assert isinstance(client, Redis)
    assert client.connection_pool.connection_kwargs["decode_responses"] is True
