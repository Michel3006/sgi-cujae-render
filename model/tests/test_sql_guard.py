import pytest

from app.services.sql_guard import READ_ONLY_ASSISTANT_MESSAGE, SqlGuardError, validate_and_fix_select


def test_rejects_empty_sql() -> None:
    with pytest.raises(ValueError, match="SQL vacío"):
        validate_and_fix_select("", 10)


def test_rejects_sql_comments() -> None:
    with pytest.raises(ValueError, match="comentarios"):
        validate_and_fix_select("SELECT 1 -- oculto", 10)


def test_rejects_multiple_statements_as_modification() -> None:
    with pytest.raises(SqlGuardError, match="una sentencia") as exc:
        validate_and_fix_select("SELECT 1; DELETE FROM integrant", 10)
    assert exc.value.modification_attempt is True


def test_rejects_non_select() -> None:
    with pytest.raises(SqlGuardError, match="SELECT") as exc:
        validate_and_fix_select("DELETE FROM integrant", 10)
    assert exc.value.modification_attempt is True


def test_rejects_forbidden_keywords() -> None:
    with pytest.raises(SqlGuardError, match="no permitidas") as exc:
        validate_and_fix_select("SELECT DROP TABLE integrant", 10)
    assert exc.value.modification_attempt is True


def test_read_only_message_is_user_friendly() -> None:
    assert "solo" in READ_ONLY_ASSISTANT_MESSAGE.lower() or "únicamente" in READ_ONLY_ASSISTANT_MESSAGE.lower()
    assert "consulta" in READ_ONLY_ASSISTANT_MESSAGE.lower()


def test_appends_limit_when_missing() -> None:
    out = validate_and_fix_select("SELECT 1 FROM integrant", 25)
    assert "LIMIT 25" in out
    assert out.endswith(";")


def test_caps_limit_when_exceeds_max() -> None:
    out = validate_and_fix_select("SELECT 1 FROM integrant LIMIT 500", 50)
    assert "LIMIT 50" in out


def test_applies_fuzzy_on_name_equality() -> None:
    out = validate_and_fix_select("SELECT 1 FROM integrant i WHERE i.name = 'Garcia'", 10)
    assert "ILIKE" in out
    assert "i.name = 'Garcia'" not in out
