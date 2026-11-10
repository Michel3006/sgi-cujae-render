import json
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class AskDataFirstParse:
    """Resultado de la primera respuesta del modelo en /ask-data."""

    sql: str | None
    direct_answer: str | None


def parse_ask_data_first_response(text: str) -> AskDataFirstParse:
    """
    Espera JSON del modelo:
    - Consulta a la BD: {"sql": "SELECT ...", "direct_answer": null}
    - Sin BD (saludo, tema general, imposible con el esquema): {"sql": null, "direct_answer": "..."}

    Si no hay JSON válido, intenta el modo antiguo (solo SELECT en texto).
    """
    stripped = text.strip()

    if "{" in stripped and "}" in stripped:
        try:
            start = stripped.index("{")
            end = stripped.rindex("}") + 1
            obj = json.loads(stripped[start:end])
        except (json.JSONDecodeError, ValueError):
            obj = None
        else:
            if isinstance(obj, dict):
                sql_raw = obj.get("sql")
                direct = obj.get("direct_answer")
                if direct is None:
                    direct = obj.get("answer")

                sql_s: str | None = None
                if isinstance(sql_raw, str) and sql_raw.strip():
                    sql_s = sql_raw.strip()

                direct_s: str | None = None
                if isinstance(direct, str) and direct.strip():
                    direct_s = direct.strip()

                if sql_s and direct_s:
                    if sql_s.upper().startswith("SELECT"):
                        return AskDataFirstParse(sql=sql_s, direct_answer=None)
                    return AskDataFirstParse(sql=None, direct_answer=direct_s)

                if sql_s:
                    return AskDataFirstParse(sql=sql_s, direct_answer=None)
                if direct_s:
                    return AskDataFirstParse(sql=None, direct_answer=direct_s)

    # Markdown ```sql
    fence = re.search(r"```(?:sql)?\s*([\s\S]*?)```", stripped, re.IGNORECASE)
    if fence:
        inner = fence.group(1).strip()
        if inner.upper().startswith("SELECT"):
            return AskDataFirstParse(sql=inner, direct_answer=None)

    # Raw SELECT
    m = re.search(r"(SELECT\s+[\s\S]+?)(?:;|\Z)", stripped, re.IGNORECASE | re.DOTALL)
    if m:
        return AskDataFirstParse(sql=m.group(1).strip(), direct_answer=None)

    raise ValueError(
        "El modelo no devolvió JSON usable. Se espera "
        '{"sql":"SELECT ...","direct_answer":null} o {"sql":null,"direct_answer":"..."}.'
    )


def extract_sql_from_llm_response(text: str) -> str:
    """Compatibilidad: solo extrae SQL (falla si es respuesta directa)."""
    parsed = parse_ask_data_first_response(text)
    if parsed.sql:
        return parsed.sql
    if parsed.direct_answer:
        raise ValueError("La respuesta es conversacional (direct_answer), no contiene SQL.")
    raise ValueError("No se pudo extraer una sentencia SELECT del modelo.")
