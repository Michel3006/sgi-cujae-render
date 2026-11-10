"""Recorta el esquema SQL al subconjunto relevante para la pregunta (modelos ligeros)."""

import re
from typing import Final

_HEADER_PREFIXES: Final = (
    "# Esquema generado",
    "# Esquema: public",
    '# La tabla "group"',
    "# Regenerar:",
)

# Palabras del usuario → nombre de tabla (sin public.)
_TABLE_HINTS: Final[dict[str, tuple[str, ...]]] = {
    "articles": ("articulo", "artículo", "articulos", "artículos", "paper", "publicacion", "publicación", "revista"),
    "books": ("libro", "libros", "capitulo", "capítulo"),
    "theses": ("tesis", "tesista"),
    "patents": ("patente", "patentes"),
    "softwares": ("software", "softwares", "aplicacion", "aplicación"),
    "norms": ("norma", "normas"),
    "prizes": ("premio", "premios"),
    "monographs": ("monografia", "monografía", "monografias", "monografías"),
    "encounters": ("evento", "eventos", "encuentro", "encuentros", "congreso"),
    "integrant": (
        "integrante",
        "integrantes",
        "investigador",
        "investigadores",
        "autor",
        "autores",
        "docente",
        "docentes",
        "profesor",
        "profesores",
        "persona",
        "personas",
    ),
    "faculty": ("facultad", "facultades", "departamento", "departamentos"),
    "group": ("grupo", "grupos", "colectivo", "colectivos"),
    "project": ("proyecto", "proyectos", "investigacion", "investigación"),
    "research_task": ("tarea", "tareas", "actividad", "actividades"),
    "countries": ("pais", "país", "paises", "países", "nacionalidad"),
}

# Siempre incluir tablas puente / núcleo para joins habituales en CUJAE.
_CORE_TABLES: Final[frozenset[str]] = frozenset(
    {"integrant", "faculty", "project", "group", "countries"}
)

_JUNCTION_SUFFIXES: Final = ("_authors", "_types", "_integrant", "_tutors", "_keyword", "_state")

_SEARCH_HINTS: Final = (
    "buscar",
    "busca",
    "encuentra",
    "nombre",
    "titulo",
    "título",
    "llamad",
    "apellido",
    "quien es",
    "quién es",
)

_PRODUCTION_TABLES: Final[frozenset[str]] = frozenset(
    {
        "articles",
        "books",
        "theses",
        "patents",
        "softwares",
        "norms",
        "prizes",
        "monographs",
        "encounters",
        "articles_authors",
        "books_authors",
        "theses_authors",
        "patents_authors",
        "softwares_authors",
        "norms_authors",
        "prizes_authors",
        "monographs_authors",
        "encounters_authors",
        "project_integrant",
        "group_integrant",
    }
)


def _normalize(text: str) -> str:
    t = text.lower()
    for src, dst in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n")):
        t = t.replace(src, dst)
    return t


def _extract_header(raw: str) -> str:
    lines: list[str] = []
    for line in raw.splitlines():
        s = line.strip()
        if s.startswith("Tabla:"):
            break
        if s.startswith("#") and not any(s.startswith(p) for p in _HEADER_PREFIXES):
            lines.append(line)
    return "\n".join(lines).strip()


def _split_table_blocks(raw: str) -> dict[str, str]:
    blocks: dict[str, str] = {}
    current_name: str | None = None
    current_lines: list[str] = []

    for line in raw.splitlines():
        m = re.match(r"^Tabla:\s*public\.(\w+)\s*$", line.strip())
        if m:
            if current_name and current_lines:
                blocks[current_name] = "\n".join(current_lines).strip()
            current_name = m.group(1)
            current_lines = [line]
        elif current_name is not None:
            current_lines.append(line)

    if current_name and current_lines:
        blocks[current_name] = "\n".join(current_lines).strip()
    return blocks


def _is_name_or_title_search(question: str) -> bool:
    q = _normalize(question)
    return any(h in q for h in _SEARCH_HINTS)


def _tables_for_question(question: str, available: frozenset[str]) -> set[str]:
    q = _normalize(question)
    selected: set[str] = set()

    if _is_name_or_title_search(question):
        selected.update(t for t in _PRODUCTION_TABLES if t in available)
        selected.update(t for t in _CORE_TABLES if t in available)

    for table, hints in _TABLE_HINTS.items():
        if table not in available:
            continue
        if table in q or any(h in q for h in hints):
            selected.add(table)

    for table in available:
        if table in q:
            selected.add(table)

    selected.update(t for t in _CORE_TABLES if t in available)

    expanded = set(selected)
    for table in list(selected):
        for suffix in _JUNCTION_SUFFIXES:
            junction = f"{table}{suffix}"
            if junction in available:
                expanded.add(junction)
        if table.endswith("_authors"):
            base = table.removesuffix("_authors")
            if base in available:
                expanded.add(base)

    if not expanded:
        expanded.update(t for t in _CORE_TABLES if t in available)

    return expanded


def select_schema_for_question(
    raw_schema: str,
    question: str,
    *,
    max_tables: int = 12,
) -> str:
    """
    Devuelve cabecera de relaciones + bloques Tabla: más relevantes para la pregunta.
    Si la pregunta no dispara tablas concretas, usa el núcleo CUJAE.
    """
    blocks = _split_table_blocks(raw_schema)
    if not blocks:
        return raw_schema.strip()

    available = frozenset(blocks)
    if _is_name_or_title_search(question):
        max_tables = max(max_tables, 20)

    selected = _tables_for_question(question, available)

    ordered = [t for t in blocks if t in selected]
    if len(ordered) > max_tables:
        core_first = [t for t in ordered if t in _CORE_TABLES]
        rest = [t for t in ordered if t not in _CORE_TABLES]
        ordered = (core_first + rest)[:max_tables]

    header = _extract_header(raw_schema)
    parts = [header] if header else []
    parts.extend(blocks[t] for t in ordered if t in blocks)
    return "\n\n".join(p for p in parts if p).strip()
