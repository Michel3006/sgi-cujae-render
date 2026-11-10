"""Fixtures compartidas para pruebas del API y servicios."""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def schema_context_minimal() -> str:
    return (
        "# Ámbito CUJAE\n"
        "Tabla: public.integrant\n"
        "  - id_integrant integer NOT NULL\n"
        "  - name character varying NOT NULL\n"
    )


class _FakePool:
    """Pool mínimo compatible con asyncpg para pruebas."""

    def __init__(self, rows: list[dict]) -> None:
        self._rows = rows

    @asynccontextmanager
    async def acquire(self):
        yield _FakeConn(self._rows)


class _FakeConn:
    def __init__(self, rows: list[dict]) -> None:
        self._rows = rows

    async def fetch(self, _sql: str):
        return self._rows


@pytest.fixture
def mock_db_pool():
    """Pool simulado que devuelve una fila fija (sin PostgreSQL real)."""
    return _FakePool([{"name": "Investigador Prueba"}])


@pytest.fixture
def test_app(schema_context_minimal: str, mock_db_pool) -> FastAPI:
    with (
        patch("app.main.create_pool", new_callable=AsyncMock, return_value=mock_db_pool),
        patch("app.main.close_pool", new_callable=AsyncMock),
    ):
        app = create_app()
    app.state.sql_schema_context = schema_context_minimal
    app.state.db_pool = mock_db_pool
    return app


@pytest.fixture
def client(test_app: FastAPI) -> TestClient:
    with TestClient(test_app, raise_server_exceptions=False) as c:
        yield c

