from app.services.ask_data_prompts import (
    build_answer_system_prompt,
    build_domain_context,
    build_fuzzy_search_rules,
    build_sql_system_prompt,
    build_synonym_glossary,
)


def test_domain_context_mentions_cujae() -> None:
    ctx = build_domain_context()
    assert "CUJAE" in ctx
    assert "universidad" in ctx.lower()


def test_synonym_glossary_maps_integrant() -> None:
    glossary = build_synonym_glossary()
    assert "integrant" in glossary
    assert "faculty" in glossary
    assert "project" in glossary


def test_fuzzy_rules_forbid_exact_equality() -> None:
    rules = build_fuzzy_search_rules()
    assert "NUNCA" in rules or "nunca" in rules.lower()
    assert "ILIKE" in rules


def test_sql_system_prompt_compact_includes_examples() -> None:
    prompt = build_sql_system_prompt(
        schema_text="Tabla: public.integrant",
        max_rows=50,
        compact=True,
    )
    assert "EJEMPLOS" in prompt
    assert "Tabla: public.integrant" in prompt
    assert "LIMIT<=50" in prompt


def test_sql_system_prompt_includes_schema_and_limits() -> None:
    prompt = build_sql_system_prompt(schema_text="Tabla: public.integrant", max_rows=50)
    assert "Tabla: public.integrant" in prompt
    assert "LIMIT<=50" in prompt
    assert "CUJAE" in prompt
    assert "ILIKE" in prompt


def test_answer_prompt_mentions_cujae_and_no_hallucination() -> None:
    prompt = build_answer_system_prompt()
    assert "CUJAE" in prompt
    assert "JSON" in prompt
