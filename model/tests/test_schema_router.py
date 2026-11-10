from app.services.schema_router import select_schema_for_question

_SAMPLE = """
# Relaciones útiles
# - articles → project

Tabla: public.articles
  - id_article integer

Tabla: public.integrant
  - id_integrant integer
  - name varchar

Tabla: public.faculty
  - id_faculty integer

Tabla: public.project
  - id_project integer

Tabla: public.theses
  - id_thesis integer
"""


def test_selects_authors_tables_for_name_search() -> None:
    out = select_schema_for_question(_SAMPLE, "Buscar integrante García")
    assert "public.integrant" in out


def test_search_expands_table_limit() -> None:
    big_schema = _SAMPLE + "\n\n" + "\n\n".join(
        f"Tabla: public.table_{i}\n  - id integer" for i in range(30)
    )
    out = select_schema_for_question(big_schema, "Buscar por nombre", max_tables=12)
    assert "public.integrant" in out


def test_selects_integrant_for_investigador_question() -> None:
    out = select_schema_for_question(_SAMPLE, "¿Cuántos investigadores hay?")
    assert "public.integrant" in out
    assert "public.theses" not in out


def test_selects_theses_for_tesis_question() -> None:
    out = select_schema_for_question(_SAMPLE, "Listar tesis")
    assert "public.theses" in out
    assert "public.integrant" in out  # core table


def test_fallback_core_when_no_match() -> None:
    out = select_schema_for_question(_SAMPLE, "xyz abc random")
    assert "public.integrant" in out
    assert "public.project" in out
