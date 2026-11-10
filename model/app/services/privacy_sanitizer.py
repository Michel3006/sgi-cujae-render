"""Elimina datos personales (PII) de filas y textos de respuesta."""

import re
from typing import Any, Final

# Columnas que nunca deben mostrarse al usuario.
_BLOCKED_COLUMNS: Final[frozenset[str]] = frozenset(
    {
        "identity",
        "email",
        "phone",
        "telefono",
        "teléfono",
        "carnet",
        "ci",
        "passport",
        "passport_number",
        "address",
        "direccion",
        "dirección",
        "curriculum",
        "password",
        "token",
        "secret",
    }
)

# Solo estos campos pueden aparecer como detalle extra en respuestas.
_SAFE_DETAIL_COLUMNS: Final[frozenset[str]] = frozenset(
    {
        "title",
        "code",
        "journal",
        "publisher",
        "fullname",
        "encounter_name",
        "chapter_title",
        "role_name",
        "year_only",
        "month_only",
        "report_date",
        "only_date",
        "doi",
        "issn",
        "isbn",
        "work_center",
        "national_group",
        "thematic",
        "city",
        "organizer",
    }
)

PII_REQUEST_MESSAGE: Final[str] = (
    "No puedo proporcionar datos personales como carnet de identidad, correo electrónico, "
    "teléfono u otra información sensible. Puedo ayudarte con consultas generales sobre "
    "producción científica, proyectos, grupos o integrantes usando nombres y títulos públicos."
)

_PII_REQUEST_HINTS: Final[tuple[str, ...]] = (
    "email",
    "correo",
    "e-mail",
    "mail ",
    "carnet",
    "identidad",
    " ci ",
    "cedula",
    "cédula",
    "telefono",
    "teléfono",
    "phone",
    "celular",
    "movil",
    "móvil",
    "passport",
    "pasaporte",
    "direccion",
    "dirección",
    "domicilio",
    "curriculum vitae",
    "curriculum",
)

_EMAIL_RE: Final = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
# Carnet/CI cubano u otros documentos (9-11 dígitos seguidos)
_CI_RE: Final = re.compile(r"\b\d{9,11}\b")
_PHONE_RE: Final = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b")


def _normalize_col(name: str) -> str:
    return name.lower().strip().strip('"')


def _is_blocked_column(name: str) -> bool:
    col = _normalize_col(name)
    if col in _BLOCKED_COLUMNS:
        return True
    return any(
        token in col
        for token in ("email", "identity", "phone", "telefono", "carnet", "passport", "password")
    )


def is_pii_request(question: str) -> bool:
    q = question.lower()
    for src, dst in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u")):
        q = q.replace(src, dst)
    return any(h in q for h in _PII_REQUEST_HINTS)


def sanitize_row(row: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in row.items() if not _is_blocked_column(k)}


def sanitize_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [sanitize_row(r) for r in rows]


def is_safe_detail_column(name: str) -> bool:
    return _normalize_col(name) in _SAFE_DETAIL_COLUMNS


def sanitize_answer_text(text: str) -> str:
    """Redacta PII residual en texto libre (p. ej. direct_answer del LLM)."""
    out = _EMAIL_RE.sub("[correo omitido]", text)
    out = _CI_RE.sub("[documento omitido]", out)
    return out
