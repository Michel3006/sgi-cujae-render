"""Detecta perfiles de modelo (ligero vs completo) para ajustar prompts y estrategia."""

from app.config import Settings


def is_light_model(model_name: str, settings: Settings) -> bool:
    if settings.light_model_mode:
        return True
    name = model_name.lower()
    return any(p.lower() in name for p in settings.light_model_patterns)


def sql_temperature(settings: Settings, requested: float, *, light: bool) -> float:
    cap = settings.light_model_temperature_sql if light else settings.ask_data_temperature_sql_cap
    return min(requested, cap)


def answer_temperature(settings: Settings, requested: float, *, light: bool) -> float:
    if light:
        return min(requested, settings.light_model_temperature_answer)
    return requested


def sql_max_tokens(settings: Settings, *, light: bool) -> int:
    if light:
        return settings.light_model_max_tokens_sql
    return settings.ask_data_max_tokens_sql


def use_deterministic_answer(settings: Settings) -> bool:
    return settings.ask_data_use_deterministic_answer


def schema_max_tables(settings: Settings, *, light: bool) -> int:
    if light:
        return min(settings.light_model_max_schema_tables, settings.ask_data_schema_max_tables)
    return settings.ask_data_schema_max_tables


def answer_max_tokens(settings: Settings, *, light: bool) -> int:
    if light:
        return settings.light_model_max_tokens_answer
    return settings.ask_data_max_tokens_answer
