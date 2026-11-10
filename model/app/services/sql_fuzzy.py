"""Normaliza filtros de texto: igualdad exacta → ILIKE por fragmentos (post-proceso del SQL del LLM)."""

import re
from typing import Final

# Columnas donde un = 'literal' del modelo suele fallar; se reescriben a ILIKE flexible.
_TEXT_FILTER_COLUMNS: Final[frozenset[str]] = frozenset(
    {
        "name",
        "fullname",
        "title",
        "encounter_name",
        "identity",
        "email",
        "work_center",
        "journal",
        "publisher",
        "institution",
        "grant_institution",
        "organizer",
        "city",
        "thematic",
        "role_name",
        "chapter_title",
        "subjects",
        "problems",
        "description",
        "code",
        "keywords",
        "resume",
        "capital",
        "study_object",
        "study_field",
        "cientific_problem",
        "main_objective",
        "national_group",
    }
)

# column = 'x'  o  alias.column = 'x'  (comillas simples)
_EQ_LITERAL: Final = re.compile(
    r"(?P<prefix>(?:\"[\w]+\"|[\w]+)\.)?"
    r"(?P<col>\"?[\w]+\"?)\s*=\s*'"
    r"(?P<val>[^']*)'"
    r"(?!\s*::)",
    re.IGNORECASE,
)

# column ILIKE 'x' sin comodines
_ILIKE_LITERAL: Final = re.compile(
    r"(?P<prefix>(?:\"[\w]+\"|[\w]+)\.)?"
    r"(?P<col>\"?[\w]+\"?)\s+ILIKE\s+'"
    r"(?P<val>[^'%]*)'"
    r"(?!\s*::)",
    re.IGNORECASE,
)


def _column_bare(col: str) -> str:
    c = col.strip().strip('"')
    return c.lower()


def _escape_like_fragment(fragment: str) -> str:
    return fragment.replace("'", "''").replace("\\", "\\\\")


def _tokens(value: str) -> list[str]:
    return [t for t in re.split(r"\s+", value.strip()) if len(t) >= 2]


def _fuzzy_predicate(col_ref: str, value: str) -> str:
    tokens = _tokens(value)
    if not tokens:
        escaped = _escape_like_fragment(value.lower())
        return f"LOWER({col_ref}) ILIKE '%{escaped}%'"
    parts = [
        f"LOWER({col_ref}) ILIKE '%{_escape_like_fragment(t.lower())}%'" for t in tokens
    ]
    return " AND ".join(parts) if len(parts) > 1 else parts[0]


def _col_ref(prefix: str | None, col: str) -> str:
    if prefix:
        return f"{prefix}{col}"
    return col


def normalize_text_equality_filters(sql: str) -> str:
    """
    Reemplaza filtros exactos en columnas de texto por ILIKE con fragmentos.
    No modifica comparaciones numéricas ni booleanas.
    """
    out = sql

    def repl_eq(m: re.Match[str]) -> str:
        col = m.group("col")
        if _column_bare(col) not in _TEXT_FILTER_COLUMNS:
            return m.group(0)
        col_ref = _col_ref(m.group("prefix"), col)
        return _fuzzy_predicate(col_ref, m.group("val"))

    out = _EQ_LITERAL.sub(repl_eq, out)

    def repl_ilike(m: re.Match[str]) -> str:
        col = m.group("col")
        val = m.group("val")
        if _column_bare(col) not in _TEXT_FILTER_COLUMNS:
            return m.group(0)
        if "%" in val or "_" in val:
            return m.group(0)
        col_ref = _col_ref(m.group("prefix"), col)
        return _fuzzy_predicate(col_ref, val)

    return _ILIKE_LITERAL.sub(repl_ilike, out)
