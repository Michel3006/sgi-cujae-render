import asyncpg
from fastapi import HTTPException, Request


async def create_pool(database_url: str) -> asyncpg.Pool:
    return await asyncpg.create_pool(database_url, min_size=1, max_size=10, command_timeout=60)


async def close_pool(pool: asyncpg.Pool | None) -> None:
    if pool is not None:
        await pool.close()


def get_db_pool(request: Request) -> asyncpg.Pool:
    pool = getattr(request.app.state, "db_pool", None)
    if pool is None:
        raise HTTPException(
            status_code=503,
            detail="Base de datos no configurada. Establece DATABASE_URL en .env (recomendado: usuario PostgreSQL solo lectura).",
        )
    return pool
