"""Pruebas de caja negra del API REST (sin LM Studio ni PostgreSQL reales)."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.config import get_settings


def _api(path: str) -> str:
    prefix = get_settings().api_prefix.rstrip("/")
    return f"{prefix}{path}"


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get(_api("/health"))
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ask_data_status_reports_ready(client: TestClient) -> None:
    response = client.get(_api("/chat/ask-data/status"))
    assert response.status_code == 200
    body = response.json()
    assert "database_configured" in body
    assert "schema_nonempty" in body
    assert body["schema_nonempty"] is True
    assert body["ready"] is True


def test_ask_data_rejects_empty_question(client: TestClient) -> None:
    response = client.post(_api("/chat/ask-data"), json={"question": ""})
    assert response.status_code == 422


def test_ask_data_direct_answer_without_database(client: TestClient) -> None:
    mock_reply = '{"sql": null, "direct_answer": "Buenos días. Soy el asistente de la CUJAE."}'
    with patch(
        "app.routers.ask_data.complete_chat_text",
        new_callable=AsyncMock,
        return_value=mock_reply,
    ):
        response = client.post(
            _api("/chat/ask-data"),
            json={"question": "Hola"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["used_database"] is False
    assert body["row_count"] == 0
    assert body["sql_executed"] == ""
    assert "CUJAE" in body["answer"]


def test_ask_data_sql_path_with_mocked_llm_and_db(client: TestClient) -> None:
    sql_gen = '{"sql": "SELECT name FROM integrant LIMIT 5", "direct_answer": null}'
    with patch(
        "app.routers.ask_data.complete_chat_text",
        new_callable=AsyncMock,
        return_value=sql_gen,
    ):
        response = client.post(
            _api("/chat/ask-data"),
            json={"question": "¿Quién es el investigador de prueba?"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["used_database"] is True
    assert body["database_query_failed"] is False
    assert body["row_count"] >= 1
    assert "SELECT" in body["sql_executed"].upper()
    assert "LIMIT" in body["sql_executed"].upper()
    assert "CUJAE" in body["answer"]
    assert len(body["rows_sample"]) >= 1


def test_ask_data_rejects_invalid_llm_json(client: TestClient) -> None:
    with patch(
        "app.routers.ask_data.complete_chat_text",
        new_callable=AsyncMock,
        return_value="respuesta sin JSON ni SELECT",
    ):
        response = client.post(
            _api("/chat/ask-data"),
            json={"question": "Dame todos los datos"},
        )
    assert response.status_code == 400


def test_ask_data_declines_pii_request(client: TestClient) -> None:
    response = client.post(
        _api("/chat/ask-data"),
        json={"question": "Dame el email del integrante García"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["input_declined"] is True
    assert "datos personales" in body["answer"].lower()
    assert "@" not in body["answer"]


def test_ask_data_declines_off_topic_in_chat(client: TestClient) -> None:
    response = client.post(
        _api("/chat/ask-data"),
        json={"question": "¿Quién ganó el partido de fútbol ayer?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["input_declined"] is True
    assert body["used_database"] is False
    assert "CUJAE" in body["answer"]


def test_ask_data_blocks_modification_with_chat_message(client: TestClient) -> None:
    bad_sql = '{"sql": "DELETE FROM integrant", "direct_answer": null}'
    with patch(
        "app.routers.ask_data.complete_chat_text",
        new_callable=AsyncMock,
        return_value=bad_sql,
    ):
        response = client.post(
            _api("/chat/ask-data"),
            json={"question": "Borra todos los investigadores"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["security_blocked"] is True
    assert body["used_database"] is False
    assert body["sql_executed"] == ""
    assert "consulta" in body["answer"].lower()
    assert "modificar" in body["answer"].lower() or "eliminar" in body["answer"].lower()
