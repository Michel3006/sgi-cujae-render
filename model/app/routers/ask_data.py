import json
from decimal import Decimal
from pathlib import Path

import asyncpg
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import get_settings
from app.db.pool import get_db_pool
from app.dependencies.http_client import get_http_client
from app.schemas.ask_data import AskDataRequest, AskDataResponse
from app.services.ask_data_prompts import (
    build_sql_retry_user_prompt,
    build_sql_system_prompt,
)
from app.services.answer_formatter import format_answer_from_rows
from app.services.input_guard import classify_user_input
from app.services.privacy_sanitizer import (
    PII_REQUEST_MESSAGE,
    is_pii_request,
    sanitize_answer_text,
    sanitize_rows,
)
from app.services.lm_studio_client import complete_chat_text
from app.services.model_profile import (
    is_light_model,
    schema_max_tables,
    sql_max_tokens,
    sql_temperature,
    use_deterministic_answer,
)
from app.services.schema_router import select_schema_for_question
from app.services.sql_guard import READ_ONLY_ASSISTANT_MESSAGE, SqlGuardError, validate_and_fix_select
from app.services.sql_llm import AskDataFirstParse, parse_ask_data_first_response

router = APIRouter(tags=["ask-data"])

_FALLBACK_DB_FAILURE_ES = (
    "No pude obtener esa información desde los registros en este momento. "
    "Prueba a reformular la pregunta; si el problema continúa, contacta con soporte técnico."
)


def _records_to_dicts(records: list[asyncpg.Record]) -> list[dict]:
    out: list[dict] = []
    for r in records:
        d: dict = {}
        for k, v in dict(r).items():
            if isinstance(v, Decimal):
                d[k] = float(v)
            elif hasattr(v, "isoformat"):
                d[k] = v.isoformat()
            else:
                d[k] = v
        out.append(d)
    return out


def _get_schema_context(request: Request) -> str:
    ctx = getattr(request.app.state, "sql_schema_context", None)
    if not ctx or not str(ctx).strip():
        raise HTTPException(
            status_code=503,
            detail="Falta el contexto de esquema. Crea el archivo indicado en SQL_SCHEMA_CONTEXT_PATH (por defecto schema_context.txt).",
        )
    return str(ctx)


def _prepare_schema_for_llm(raw: str, max_chars: int) -> str:
    """Recorta el esquema. Solo omite comentarios de cabecera del archivo; las líneas # con relaciones sí entran al LLM."""
    skip_comment_prefixes = (
        "# Esquema generado",
        "# Esquema: public",
        '# La tabla "group"',
        "# Regenerar:",
    )

    def skip_line(line: str) -> bool:
        s = line.strip()
        if not s.startswith("#"):
            return False
        return any(s.startswith(p) for p in skip_comment_prefixes)

    lines = [ln for ln in raw.splitlines() if not skip_line(ln)]
    text = "\n".join(lines).strip()
    if max_chars <= 0 or len(text) <= max_chars:
        return text
    return (
        text[:max_chars]
        + "\n\n[... ESQUEMA TRUNCADO: sube SQL_SCHEMA_MAX_CHARS en .env o acorta schema_context.txt ...]"
    )


async def _generate_sql_parse(
    *,
    client: httpx.AsyncClient,
    settings,
    body: AskDataRequest,
    schema_text: str,
    light: bool,
) -> AskDataFirstParse:
    sql_system = build_sql_system_prompt(
        schema_text=schema_text,
        max_rows=settings.sql_max_rows,
        compact=light,
    )
    sql_user = f"Pregunta del usuario:\n{body.question.strip()}"
    model = body.model or settings.default_model
    temp = sql_temperature(settings, body.temperature_sql, light=light)
    tokens = sql_max_tokens(settings, light=light)

    async def _call(system: str, user: str) -> str:
        return await complete_chat_text(
            client,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            model=model,
            temperature=temp,
            max_tokens=tokens,
        )

    try:
        raw = await _call(sql_system, sql_user)
        return parse_ask_data_first_response(raw)
    except ValueError:
        if not light:
            raise
        retry_user = build_sql_retry_user_prompt(
            question=body.question,
            schema_text=schema_text,
            max_rows=settings.sql_max_rows,
        )
        raw_retry = await _call(
            "Responde SOLO JSON válido en una línea. Sin markdown.",
            retry_user,
        )
        return parse_ask_data_first_response(raw_retry)


@router.post("/chat/ask-data", response_model=AskDataResponse)
async def ask_data(
    request: Request,
    body: AskDataRequest,
    pool: asyncpg.Pool = Depends(get_db_pool),
    client: httpx.AsyncClient = Depends(get_http_client),
) -> AskDataResponse:
    settings = get_settings()
    classification = classify_user_input(body.question)
    if classification.kind == "decline_domain":
        return AskDataResponse(
            answer=classification.message or "",
            sql_executed="",
            row_count=0,
            used_database=False,
            database_query_failed=False,
            rows_sample=[],
            input_declined=True,
        )
    if classification.kind == "decline_inappropriate":
        return AskDataResponse(
            answer=classification.message or "",
            sql_executed="",
            row_count=0,
            used_database=False,
            database_query_failed=False,
            rows_sample=[],
            input_declined=True,
        )

    if is_pii_request(body.question):
        return AskDataResponse(
            answer=PII_REQUEST_MESSAGE,
            sql_executed="",
            row_count=0,
            used_database=False,
            database_query_failed=False,
            rows_sample=[],
            input_declined=True,
        )

    model_name = body.model or settings.default_model
    light = is_light_model(model_name, settings)

    raw_schema = _get_schema_context(request)
    if settings.ask_data_schema_routing:
        raw_schema = select_schema_for_question(
            raw_schema,
            body.question,
            max_tables=schema_max_tables(settings, light=light),
        )
    schema_text = _prepare_schema_for_llm(raw_schema, settings.sql_schema_max_chars)

    try:
        first = await _generate_sql_parse(
            client=client,
            settings=settings,
            body=body,
            schema_text=schema_text,
            light=light,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Error al llamar al modelo: {e!s}") from e

    if first.direct_answer and not first.sql:
        return AskDataResponse(
            answer=sanitize_answer_text(first.direct_answer.strip()),
            sql_executed="",
            row_count=0,
            used_database=False,
            database_query_failed=False,
            rows_sample=[],
        )

    if not first.sql:
        raise HTTPException(
            status_code=400,
            detail="El modelo no devolvió ni SQL ni direct_answer. Reformula la pregunta.",
        )

    try:
        safe_sql = validate_and_fix_select(first.sql, settings.sql_max_rows)
    except SqlGuardError as e:
        if e.modification_attempt:
            return AskDataResponse(
                answer=READ_ONLY_ASSISTANT_MESSAGE,
                sql_executed="",
                row_count=0,
                used_database=False,
                database_query_failed=False,
                rows_sample=[],
                security_blocked=True,
            )
        raise HTTPException(status_code=400, detail=f"[Validación SQL] {e}") from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"[Validación SQL] {e}") from e

    try:
        async with pool.acquire() as conn:
            records = await conn.fetch(safe_sql)
    except asyncpg.PostgresError:
        friendly = _FALLBACK_DB_FAILURE_ES
        return AskDataResponse(
            answer=friendly,
            sql_executed=safe_sql.strip(),
            row_count=0,
            used_database=True,
            database_query_failed=True,
            rows_sample=[],
        )

    rows = sanitize_rows(_records_to_dicts(list(records)))
    row_count = len(rows)
    cap = settings.ask_data_max_rows_in_prompt
    rows_for_prompt = rows[:cap]
    truncated = row_count > cap

    use_deterministic = use_deterministic_answer(settings)
    if use_deterministic:
        answer_text = format_answer_from_rows(
            body.question,
            rows_for_prompt,
            row_count,
            truncated=truncated,
        )
    else:
        from app.services.ask_data_prompts import build_answer_system_prompt
        from app.services.model_profile import answer_max_tokens, answer_temperature

        answer_user = (
            f"Pregunta del usuario:\n{body.question.strip()}\n\n"
            "Resultado de la consulta (JSON). "
            + ("Nota: solo se muestran las primeras filas; indica si hace falta resumir o contar.\n" if truncated else "")
            + f"\n{json.dumps(rows_for_prompt, default=str, ensure_ascii=False)}"
        )

        answer_system = build_answer_system_prompt(compact=light)

        try:
            answer_text = await complete_chat_text(
                client,
                messages=[
                    {"role": "system", "content": answer_system},
                    {"role": "user", "content": answer_user},
                ],
                model=model_name,
                temperature=answer_temperature(settings, body.temperature_answer, light=light),
                max_tokens=answer_max_tokens(settings, light=light),
            )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Error al generar la respuesta final: {e!s}") from e

        answer_text = answer_text.strip()

    answer_text = sanitize_answer_text(answer_text)

    sample_limit = min(20, row_count)
    return AskDataResponse(
        answer=answer_text,
        sql_executed=safe_sql.strip(),
        row_count=row_count,
        used_database=True,
        database_query_failed=False,
        rows_sample=sanitize_rows(rows[:sample_limit]),
    )


@router.get("/chat/ask-data/status")
async def ask_data_status(request: Request) -> dict[str, bool | str]:
    """Comprueba si la BD y el archivo de esquema están configurados."""
    settings = get_settings()
    has_db = getattr(request.app.state, "db_pool", None) is not None
    path = Path(settings.sql_schema_context_path)
    has_schema = path.is_file() and bool(path.read_text(encoding="utf-8").strip())
    return {
        "database_configured": has_db,
        "schema_file_exists": path.is_file(),
        "schema_nonempty": has_schema,
        "schema_path": str(path.resolve()),
        "ready": bool(has_db and has_schema),
    }
