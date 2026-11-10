import contextlib
from pathlib import Path

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.pool import close_pool, create_pool
from app.middleware.error_handler import UnhandledErrorMiddleware
from app.routers import ask_data as ask_data_router
from app.routers import chat as chat_router
from app.routers import health as health_router


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    timeout = httpx.Timeout(60.0, connect=60.0, read=None)
    limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
    app.state.http_client = httpx.AsyncClient(timeout=timeout, limits=limits)

    if settings.database_url:
        app.state.db_pool = await create_pool(settings.database_url)
    else:
        app.state.db_pool = None

    schema_path = Path(settings.sql_schema_context_path)
    if schema_path.is_file():
        app.state.sql_schema_context = schema_path.read_text(encoding="utf-8")
    else:
        app.state.sql_schema_context = ""

    try:
        yield
    finally:
        client = getattr(app.state, "http_client", None)
        if client is not None:
            await client.aclose()
        await close_pool(getattr(app.state, "db_pool", None))


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    if settings.enable_cors:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.add_middleware(UnhandledErrorMiddleware)

    # Mount routers under a common prefix
    prefix = settings.api_prefix
    app.include_router(health_router.router, prefix=prefix)
    app.include_router(chat_router.router, prefix=prefix)
    app.include_router(ask_data_router.router, prefix=prefix)
    return app


app = create_app()

