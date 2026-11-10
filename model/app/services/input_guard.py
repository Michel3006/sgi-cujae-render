"""Clasificación previa de entradas del usuario (dominio CUJAE, cortesía, rechazo)."""

import re
from dataclasses import dataclass
from typing import Final, Literal

InputKind = Literal["proceed", "decline_domain", "decline_inappropriate", "conversational"]

OUT_OF_DOMAIN_MESSAGE: Final[str] = (
    "Solo puedo ayudarte con consultas sobre la gestión de investigaciones y la producción "
    "científica de la CUJAE, además de una comunicación natural breve contigo. "
    "Si deseas información sobre proyectos, integrantes, grupos, facultades, publicaciones "
    "u otros datos del sistema, indícamelo y con gusto te apoyo."
)

INAPPROPRIATE_MESSAGE: Final[str] = (
    "Prefiero mantener una conversación respetuosa y enfocada en la gestión de investigación "
    "de la CUJAE. Si deseas consultar datos del sistema, reformula tu pregunta y te ayudaré."
)

_DOMAIN_KEYWORDS: Final[tuple[str, ...]] = (
    "cujae",
    "universidad",
    "investig",
    "integrant",
    "integrante",
    "proyecto",
    "project",
    "grupo",
    "facultad",
    "articulo",
    "artículo",
    "publicacion",
    "publicación",
    "tesis",
    "patente",
    "libro",
    "software",
    "norma",
    "premio",
    "monografia",
    "monografía",
    "evento",
    "encuentro",
    "autor",
    "docente",
    "profesor",
    "produccion",
    "producción",
    "cientific",
    "científic",
    "resumen ejecutivo",
    "resumen de",
    "informe",
    "tarea",
    "objetivo",
    "pais",
    "país",
    "base de datos",
    "registro",
    "sistema",
    "buscar",
    "busca",
    "encuentra",
    "listar",
    "lista",
    "cuantos",
    "cuántos",
    "cuantas",
    "cuántas",
    "mostrar",
    "dame",
    "dime",
)

_CONVERSATIONAL_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(r"^(hola|buenos dias|buenas tardes|buenas noches|hey|saludos|gracias|muchas gracias|ok|vale|adios|adiós|chao|buen dia|buen día)[\s!.?]*$", re.I),
    re.compile(r"^(quien eres|quién eres|que eres|qué eres|que puedes hacer|qué puedes hacer|ayuda|help)[\s?.!]*$", re.I),
)

_INAPPROPRIATE_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(r"\b(idiot|estupid|imbecil|imbécil|mierda|pendej|cabron|cabron|maric|put[oa]|joder|coño|cono|malparid|hij[oa] de put|vete a la|maldit)\w*\b", re.I),
    re.compile(r"\b(insult|ofend|matar|violent)\w*\b", re.I),
)

_OFF_TOPIC_STRONG: Final[tuple[str, ...]] = (
    "partido de",
    "futbol",
    "fútbol",
    "bitcoin",
    "criptomoneda",
    "receta de cocina",
    "clima en",
    "tiempo en",
    "capital de francia",
    "capital de espana",
    "quien gano el mundial",
    "netflix",
    "pelicula",
    "película",
    "chisme",
)


@dataclass(frozen=True)
class InputClassification:
    kind: InputKind
    message: str | None = None


def _normalize(text: str) -> str:
    t = text.lower().strip()
    for src, dst in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n")):
        t = t.replace(src, dst)
    return t


def _has_domain_signal(question: str) -> bool:
    q = _normalize(question)
    return any(k in q for k in _DOMAIN_KEYWORDS)


def _is_conversational(question: str) -> bool:
    q = question.strip()
    if len(q) > 120:
        return False
    return any(p.search(q) for p in _CONVERSATIONAL_PATTERNS)


def _is_inappropriate(question: str) -> bool:
    return any(p.search(question) for p in _INAPPROPRIATE_PATTERNS)


def _is_strongly_off_topic(question: str) -> bool:
    q = _normalize(question)
    return any(t in q for t in _OFF_TOPIC_STRONG)


def classify_user_input(question: str) -> InputClassification:
    """
    Filtra entradas antes de llamar al LLM.
    - proceed: dominio CUJAE o consulta de datos
    - conversational: saludos/cortesía (el LLM responde breve)
    - decline_domain / decline_inappropriate: respuesta fija sin LLM
    """
    text = question.strip()
    if not text:
        return InputClassification(kind="decline_domain", message=OUT_OF_DOMAIN_MESSAGE)

    if _is_inappropriate(text):
        return InputClassification(kind="decline_inappropriate", message=INAPPROPRIATE_MESSAGE)

    if _has_domain_signal(text):
        return InputClassification(kind="proceed")

    if _is_conversational(text):
        return InputClassification(kind="conversational")

    if _is_strongly_off_topic(text):
        return InputClassification(kind="decline_domain", message=OUT_OF_DOMAIN_MESSAGE)

    # Pregunta genérica sin señal de dominio ni saludo claro
    if len(text.split()) <= 4 and not _has_domain_signal(text):
        return InputClassification(kind="decline_domain", message=OUT_OF_DOMAIN_MESSAGE)

    # Consultas largas ambiguas: dejar pasar al LLM con reglas de dominio en prompt
    return InputClassification(kind="proceed")
