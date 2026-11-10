from typing import Any

from pydantic import BaseModel, Field


class AskDataRequest(BaseModel):
    question: str = Field(min_length=1, description="Pregunta en lenguaje natural sobre los datos")
    model: str | None = Field(default=None, description="Modelo LM Studio; por defecto el del servidor")
    temperature_sql: float = Field(default=0.1, ge=0.0, le=2.0, description="Temperatura para generar SQL")
    temperature_answer: float = Field(default=0.3, ge=0.0, le=2.0, description="Temperatura para la respuesta final")


class AskDataResponse(BaseModel):
    answer: str = Field(description="Respuesta en lenguaje natural")
    sql_executed: str = Field(
        default="",
        description="SQL SELECT ejecutado; vacío si la respuesta fue directa sin consultar la BD",
    )
    row_count: int = Field(description="Filas devueltas por la consulta; 0 si no hubo SQL")
    used_database: bool = Field(description="True si se intentó o ejecutó SQL contra PostgreSQL")
    database_query_failed: bool = Field(
        default=False,
        description="True si hubo error al ejecutar el SQL en PostgreSQL (la respuesta explica la situación al usuario)",
    )
    rows_sample: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Muestra de filas devueltas (acotada para la respuesta y el cliente)",
    )
    security_blocked: bool = Field(
        default=False,
        description="True si sql_guard bloqueó un intento de modificación u operación no permitida",
    )
    input_declined: bool = Field(
        default=False,
        description="True si la entrada fue rechazada por estar fuera de dominio o ser inapropiada",
    )
