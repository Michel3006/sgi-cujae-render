from app.services.privacy_sanitizer import (
    is_pii_request,
    is_safe_detail_column,
    sanitize_answer_text,
    sanitize_row,
    sanitize_rows,
)


def test_sanitize_row_removes_email_and_identity() -> None:
    row = {"name": "Ana", "email": "ana@test.com", "identity": "99010112345"}
    clean = sanitize_row(row)
    assert clean == {"name": "Ana"}
    assert "email" not in clean
    assert "identity" not in clean


def test_sanitize_answer_text_redacts_email() -> None:
    text = "Contacto: usuario@cujae.edu.cu para más info."
    out = sanitize_answer_text(text)
    assert "usuario@cujae.edu.cu" not in out
    assert "[correo omitido]" in out


def test_pii_request_detected() -> None:
    assert is_pii_request("Dame el email del integrante García")
    assert is_pii_request("¿Cuál es el carnet de identidad de López?")


def test_safe_detail_allows_title_not_email() -> None:
    assert is_safe_detail_column("title")
    assert not is_safe_detail_column("email")
