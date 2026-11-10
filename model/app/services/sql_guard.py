import re
from typing import Final

from app.services.sql_fuzzy import normalize_text_equality_filters

READ_ONLY_ASSISTANT_MESSAGE: Final[str] = (
    "No puedo realizar esa acción. Este asistente es únicamente de consulta: "
    "puedo ayudarte a buscar y resumir información registrada en la CUJAE, "
    "pero no puedo crear, modificar ni eliminar datos. "
    "Si necesitas cambiar registros, utiliza las pantallas de gestión del sistema."
)

_FORBIDDEN_KEYWORDS: Final = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|EXECUTE|CALL|PREPARE)\b",
    re.IGNORECASE | re.DOTALL,
)
_SECOND_STMT: Final = re.compile(r";\s*\S")


class SqlGuardError(ValueError):
    """SQL rechazado por el filtro de seguridad."""

    def __init__(self, message: str, *, modification_attempt: bool = False) -> None:
        super().__init__(message)
        self.modification_attempt = modification_attempt


def validate_and_fix_select(sql: str, max_rows: int) -> str:
    """
    Allow only a single SELECT. Append LIMIT if missing. Reject comments and multiple statements.
    """
    raw = sql.strip()
    if not raw:
        raise SqlGuardError("SQL vacío.")

    if "--" in raw or "/*" in raw:
        raise SqlGuardError("No se permiten comentarios SQL (-- o /* */).")

    if _SECOND_STMT.search(raw.rstrip(";")):
        raise SqlGuardError(
            "Solo se permite una sentencia SQL.",
            modification_attempt=True,
        )

    one = raw.rstrip().rstrip(";")
    one = normalize_text_equality_filters(one)
    upper = one.upper()
    if not upper.startswith("SELECT"):
        raise SqlGuardError(
            "Solo se permiten consultas SELECT.",
            modification_attempt=True,
        )

    if _FORBIDDEN_KEYWORDS.search(one):
        raise SqlGuardError(
            "La consulta contiene palabras clave no permitidas.",
            modification_attempt=True,
        )

    if re.search(r"\bINTO\s+OUTFILE\b", one, re.IGNORECASE):
        raise SqlGuardError("Consulta no permitida.", modification_attempt=True)

    if " LIMIT " not in upper and not upper.endswith(" LIMIT"):
        one = f"{one} LIMIT {max_rows}"
    else:
        m = re.search(r"\bLIMIT\s+(\d+)\s*$", one, re.IGNORECASE)
        if m and int(m.group(1)) > max_rows:
            one = re.sub(r"\bLIMIT\s+\d+\s*$", f"LIMIT {max_rows}", one, flags=re.IGNORECASE)

    return one + ";"
