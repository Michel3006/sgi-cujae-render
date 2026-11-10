"""Respuestas en español a partir de filas de BD (sin alucinar)."""

from typing import Any

from app.services.privacy_sanitizer import is_safe_detail_column

_DISPLAY_COLUMNS: tuple[str, ...] = (
    "name",
    "fullname",
    "title",
    "code",
    "encounter_name",
    "journal",
    "chapter_title",
    "role_name",
)

_COUNT_HINTS: tuple[str, ...] = (
    "cuantos",
    "cuántos",
    "cuantas",
    "cuántas",
    "cantidad",
    "total",
    "numero",
    "número",
    "cuenta",
)

_SUMMARY_HINTS: tuple[str, ...] = (
    "resumen ejecutivo",
    "resumen de",
    "produccion cientifica",
    "producción científica",
    "informe de",
    "sintesis",
    "síntesis",
    "resume la produccion",
    "resume la producción",
)

_SEARCH_HINTS: tuple[str, ...] = (
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


def _normalize(text: str) -> str:
    t = text.lower()
    for src, dst in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u")):
        t = t.replace(src, dst)
    return t


def _wants_count(question: str) -> bool:
    q = _normalize(question)
    return any(h in q for h in _COUNT_HINTS)


def _wants_executive_summary(question: str) -> bool:
    q = _normalize(question)
    return any(h in q for h in _SUMMARY_HINTS)


def _wants_search(question: str) -> bool:
    q = _normalize(question)
    return any(h in q for h in _SEARCH_HINTS)


def _pick_label(row: dict[str, Any]) -> str:
    for col in _DISPLAY_COLUMNS:
        for key, val in row.items():
            if key.lower() == col and val is not None and str(val).strip():
                return str(val).strip()
    for key, val in row.items():
        if val is not None and str(val).strip() and not key.lower().startswith("id_"):
            return str(val).strip()
    return str(row)


def _row_detail_line(row: dict[str, Any]) -> str:
    parts: list[str] = []
    for col in _DISPLAY_COLUMNS:
        for key, val in row.items():
            if key.lower() == col and val is not None and str(val).strip():
                parts.append(str(val).strip())
                break
    if not parts:
        parts.append(_pick_label(row))
    extras = [
        f"{k}: {v}"
        for k, v in row.items()
        if v is not None
        and str(v).strip()
        and is_safe_detail_column(k)
    ][:3]
    if extras:
        return f"{parts[0]} ({'; '.join(extras)})"
    return parts[0]


def _is_count_row(row: dict[str, Any]) -> tuple[str, Any] | None:
    if len(row) != 1:
        return None
    key, val = next(iter(row.items()))
    key_l = key.lower()
    if "count" in key_l or key_l in ("total", "num", "cantidad", "total_count"):
        return key, val
    if isinstance(val, (int, float)) and not isinstance(val, bool):
        return key, val
    return None


def _format_executive_summary(rows: list[dict[str, Any]], row_count: int, *, truncated: bool) -> str:
    lines = ["Resumen ejecutivo de producción científica (CUJAE)", ""]
    if row_count == 0:
        lines.append("No se encontraron registros para elaborar el resumen.")
        return "\n".join(lines)

    titles = [r.get("title") or r.get("name") or r.get("encounter_name") for r in rows[:15]]
    titles = [str(t).strip() for t in titles if t is not None and str(t).strip()]
    unique_titles = list(dict.fromkeys(titles))

    lines.append(f"- Total de registros consultados: {row_count}")
    if unique_titles:
        lines.append(f"- Elementos identificados en la muestra: {len(unique_titles)}")
        lines.append("- Detalle (coincidencias por nombre/título):")
        for t in unique_titles[:12]:
            lines.append(f"  · {t}")
        if len(unique_titles) > 12:
            lines.append(f"  · … y {len(unique_titles) - 12} más")
    if truncated:
        lines.append("")
        lines.append("Nota: el resumen se basa en una muestra parcial de los resultados.")
    lines.append("")
    lines.append(
        "Este resumen se generó únicamente a partir de los datos devueltos por la consulta; "
        "no incluye información fuera del sistema."
    )
    return "\n".join(lines)


def format_answer_from_rows(
    question: str,
    rows: list[dict[str, Any]],
    row_count: int,
    *,
    truncated: bool = False,
) -> str:
    """Genera respuesta breve usando solo los datos de `rows`."""
    if row_count == 0:
        return (
            "No encontré registros en la base de datos de la CUJAE que coincidan con tu pregunta. "
            "Prueba con otro nombre, apellido o parte del título (por ejemplo solo el apellido)."
        )

    if _wants_executive_summary(question):
        return _format_executive_summary(rows, row_count, truncated=truncated)

    if row_count == 1:
        count_info = _is_count_row(rows[0])
        if count_info:
            _, val = count_info
            if _wants_count(question):
                return f"Hay {val} registro(s) en la CUJAE según la consulta."
            return f"Según los registros de la CUJAE, el resultado es {val}."

    if _wants_search(question):
        preview = [_row_detail_line(r) for r in rows[:10]]
        unique = list(dict.fromkeys(preview))
        intro = (
            f"Encontré {row_count} coincidencia(s) aproximada(s) por nombre o título en la CUJAE:\n"
            if row_count > 1
            else "Encontré esta coincidencia en la CUJAE:\n"
        )
        lines = "\n".join(f"- {item}" for item in unique)
        suffix = ""
        if row_count > len(unique):
            suffix = f"\n\n(Y {row_count - len(unique)} registro(s) más no mostrados aquí.)"
        if truncated:
            suffix += "\n\n(La búsqueda devolvió muchas filas; aquí hay una muestra.)"
        return intro + lines + suffix

    labels = [_pick_label(r) for r in rows]
    unique_labels = list(dict.fromkeys(labels))

    if row_count == 1:
        extra = ""
        if len(rows[0]) > 1:
            details = [
                f"{k}: {v}"
                for k, v in rows[0].items()
                if v is not None and str(v).strip() and is_safe_detail_column(k)
            ][:4]
            if details:
                extra = " (" + "; ".join(details) + ")"
        return f"Según los registros de la CUJAE: {unique_labels[0]}{extra}."

    preview = unique_labels[:10]
    lines = "\n".join(f"- {label}" for label in preview)
    suffix = ""
    if row_count > len(preview):
        suffix = f"\n\n(Y {row_count - len(preview)} registro(s) más no mostrados aquí.)"
    if truncated:
        suffix += "\n\n(La consulta devolvió muchas filas; este resumen usa una muestra.)"

    if _wants_count(question):
        return f"Hay {row_count} registro(s) en la CUJAE."

    return f"Encontré {row_count} registro(s) en la CUJAE:\n{lines}{suffix}"
