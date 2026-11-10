from app.services.sql_fuzzy import normalize_text_equality_filters


def test_equality_becomes_ilike_single_token() -> None:
    sql = "SELECT * FROM public.integrant i WHERE i.name = 'Garcia' LIMIT 10"
    out = normalize_text_equality_filters(sql)
    assert "i.name = 'Garcia'" not in out
    assert "LOWER(i.name) ILIKE '%garcia%'" in out


def test_equality_multiword_uses_and() -> None:
    sql = "SELECT 1 FROM public.faculty f WHERE f.fullname = 'Maria Lopez' LIMIT 5"
    out = normalize_text_equality_filters(sql)
    assert "LOWER(f.fullname) ILIKE '%maria%'" in out
    assert "LOWER(f.fullname) ILIKE '%lopez%'" in out
    assert " AND " in out


def test_numeric_equality_unchanged() -> None:
    sql = "SELECT 1 FROM public.project p WHERE p.id_faculty = 3 LIMIT 5"
    out = normalize_text_equality_filters(sql)
    assert out == sql


def test_ilike_without_wildcards_gets_tokens() -> None:
    sql = "SELECT 1 FROM public.articles a WHERE a.title ILIKE 'Redes neuronales' LIMIT 5"
    out = normalize_text_equality_filters(sql)
    assert "ilike '%redes%'" in out.lower()
    assert "ilike '%neuronales%'" in out.lower()
