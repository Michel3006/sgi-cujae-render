"""Extract CREATE TABLE definitions from a PostgreSQL dump (may contain binary)."""
from __future__ import annotations

import re
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    dump = root / ".cursor" / "bd" / "sistema_integrado.sql"
    out = root / "schema_context.txt"
    data = dump.read_bytes()
    text = data.decode("utf-8", errors="replace")

    # Match CREATE TABLE public.name ( ... );
    pat = re.compile(
        r'CREATE TABLE public\.(?P<name>(?:"[^"]+"|\w+))\s*\((?P<body>.*?)\);',
        re.DOTALL | re.IGNORECASE,
    )
    found: list[tuple[str, str]] = []
    for m in pat.finditer(text):
        name = m.group("name")
        body = m.group("body").strip()
        # Normalize quoted identifiers for display
        display_name = name.strip('"') if name.startswith('"') else name
        found.append((display_name, body))

    if not found:
        raise SystemExit("No CREATE TABLE blocks found. Is the dump format compatible?")

    # Deduplicate by name (keep first)
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for name, body in found:
        if name in seen:
            continue
        seen.add(name)
        unique.append((name, body))

    lines: list[str] = [
        "# Esquema generado desde .cursor/bd/sistema_integrado.sql (volcado PostgreSQL).",
        "# Esquema: public — en SQL usar solo SELECT.",
        '# La tabla "group" es palabra reservada: referenciarla como public."group" (comillas dobles).',
        "# Regenerar: python scripts/extract_schema_from_dump.py",
        "#",
        "# DOMINIO: Sistema de producción científica de la CUJAE (Universidad Tecnológica José Antonio Echeverría).",
        "# Todos los registros son de esa institución; no buscar ni inventar otras universidades por nombre.",
        "#",
        "# Relaciones útiles (el modelo suele equivocarse si esto no está explícito):",
        "# - public.articles NO tiene id_faculty ni id_faculty_area; tiene id_project → join public.project (p.id_project) y usar p.id_faculty.",
        "# - Varios productos (books, norms, patents, softwares, theses, monographs, encounters, prizes) llevan id_project y/o id_group; facultad suele ir por project.id_faculty.",
        "",
    ]
    for name, body in sorted(unique, key=lambda x: x[0].lower()):
        lines.append(f"Tabla: public.{name}")
        # Split columns by comma at top level (rough: lines often one column per line in dumps)
        col_parts = _split_columns(body)
        for col in col_parts:
            c = " ".join(col.split())
            if c:
                lines.append(f"  - {c}")
        lines.append("")

    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(unique)} tables to {out}")


def _split_columns(body: str) -> list[str]:
    """Split table body on commas not inside parentheses."""
    parts: list[str] = []
    depth = 0
    current: list[str] = []
    for ch in body:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            part = "".join(current).strip()
            if part:
                parts.append(part)
            current = []
            continue
        current.append(ch)
    tail = "".join(current).strip()
    if tail:
        parts.append(tail)
    return parts


if __name__ == "__main__":
    main()
