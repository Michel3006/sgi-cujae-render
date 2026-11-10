from app.services.input_guard import (
    INAPPROPRIATE_MESSAGE,
    OUT_OF_DOMAIN_MESSAGE,
    classify_user_input,
)


def test_declines_off_topic_football() -> None:
    result = classify_user_input("¿Quién ganó el partido de fútbol ayer?")
    assert result.kind == "decline_domain"
    assert result.message == OUT_OF_DOMAIN_MESSAGE


def test_declines_inappropriate_language() -> None:
    result = classify_user_input("Eres un idiota, dime algo")
    assert result.kind == "decline_inappropriate"
    assert result.message == INAPPROPRIATE_MESSAGE


def test_allows_domain_integrant_query() -> None:
    result = classify_user_input("Buscar integrante García")
    assert result.kind == "proceed"


def test_allows_greeting_as_conversational() -> None:
    result = classify_user_input("Hola")
    assert result.kind == "conversational"


def test_allows_executive_summary_request() -> None:
    result = classify_user_input("Resumen ejecutivo de producción del investigador López")
    assert result.kind == "proceed"
