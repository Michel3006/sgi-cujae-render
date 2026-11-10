from collections.abc import AsyncIterator
import httpx
from fastapi import Request


async def get_http_client(request: Request) -> AsyncIterator[httpx.AsyncClient]:
    client = getattr(request.app.state, "http_client", None)
    if client is None:
        raise RuntimeError("HTTP client not initialized")
    return client

