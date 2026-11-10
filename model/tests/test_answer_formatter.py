from app.services.answer_formatter import format_answer_from_rows
from app.services.privacy_sanitizer import sanitize_rows


def test_empty_rows_message() -> None:
    msg = format_answer_from_rows("¿Hay datos?", [], 0)
    assert "No encontré registros" in msg
    assert "CUJAE" in msg


def test_count_with_cuantos_question() -> None:
    msg = format_answer_from_rows("¿Cuántos integrantes hay?", [{"total": 42}], 1)
    assert "42" in msg
    assert "Hay" in msg


def test_count_single_row() -> None:
    msg = format_answer_from_rows("¿Cuántos?", [{"total": 42}], 1)
    assert "42" in msg


def test_search_format_shows_detail_without_pii() -> None:
    rows = [{"name": "Ana García", "email": "ana@cujae.edu.cu", "title": "Paper X"}]
    rows = sanitize_rows(rows)
    msg = format_answer_from_rows("Buscar integrante García", rows, 1)
    assert "García" in msg
    assert "cujae.edu.cu" not in msg
    assert "coincidencia" in msg.lower()


def test_executive_summary_format() -> None:
    rows = [{"title": "Paper A"}, {"title": "Paper B"}]
    msg = format_answer_from_rows("Resumen ejecutivo del investigador", rows, 2)
    assert "Resumen ejecutivo" in msg
    assert "Paper A" in msg


def test_list_multiple_rows() -> None:
    rows = [{"name": "Ana"}, {"name": "Luis"}]
    msg = format_answer_from_rows("Integrantes", rows, 2)
    assert "Ana" in msg
    assert "Luis" in msg
    assert "2 registro" in msg
