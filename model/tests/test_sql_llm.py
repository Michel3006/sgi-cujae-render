import pytest

from app.services.sql_llm import (
    AskDataFirstParse,
    extract_sql_from_llm_response,
    parse_ask_data_first_response,
)


def test_parse_json_with_sql() -> None:
    text = '{"sql": "SELECT 1", "direct_answer": null}'
    parsed = parse_ask_data_first_response(text)
    assert parsed == AskDataFirstParse(sql="SELECT 1", direct_answer=None)


def test_parse_json_direct_answer_only() -> None:
    text = '{"sql": null, "direct_answer": "Hola, ¿en qué puedo ayudarte?"}'
    parsed = parse_ask_data_first_response(text)
    assert parsed.sql is None
    assert "Hola" in (parsed.direct_answer or "")


def test_parse_markdown_sql_fence() -> None:
    text = 'Texto previo\n```sql\nSELECT id FROM integrant\n```'
    parsed = parse_ask_data_first_response(text)
    assert parsed.sql is not None
    assert parsed.sql.upper().startswith("SELECT")


def test_prefers_sql_when_both_sql_and_direct_answer() -> None:
    text = '{"sql": "SELECT 1", "direct_answer": "ignorar"}'
    parsed = parse_ask_data_first_response(text)
    assert parsed.sql == "SELECT 1"
    assert parsed.direct_answer is None


def test_invalid_response_raises() -> None:
    with pytest.raises(ValueError, match="JSON usable"):
        parse_ask_data_first_response("No hay SQL ni JSON aquí")


def test_extract_sql_from_llm_response() -> None:
    sql = extract_sql_from_llm_response('{"sql":"SELECT 2","direct_answer":null}')
    assert sql == "SELECT 2"


def test_extract_sql_fails_on_direct_answer() -> None:
    with pytest.raises(ValueError, match="conversacional"):
        extract_sql_from_llm_response('{"sql":null,"direct_answer":"solo charla"}')
