from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Base URL of LM Studio's OpenAI-compatible server, e.g. http://localhost:1234/v1
    lm_studio_base_url: str = Field(default="http://localhost:1234/api")
    # Optional API key if your LM Studio server requires it
    lm_studio_api_key: str | None = Field(default=None)
    # Default model to use (you can override per request)
    default_model: str = Field(default="local-model")
    # PostgreSQL (text-to-SQL). Usuario recomendado: solo lectura (SELECT).
    database_url: str | None = Field(default=None, description="postgresql://user:pass@host:5432/dbname")
    # Ruta al archivo con descripción del esquema (tablas, columnas) para el LLM
    sql_schema_context_path: str = Field(default="schema_context.txt")
    sql_max_rows: int = Field(default=100, ge=1, le=10_000)
    # Máximo de filas enviadas al modelo en la segunda pasada (ahorra tokens)
    ask_data_max_rows_in_prompt: int = Field(default=50, ge=1, le=500)
    # Caracteres máximos del esquema en ask-data. Con modelos n_ctx=4096 en LM Studio, ~5k–8k suele ser el techo seguro.
    # 0 = sin límite (solo si subes el contexto del modelo o usas modelo grande).
    sql_schema_max_chars: int = Field(default=5500, ge=0)
    # Tokens máximos por respuesta del modelo en ask-data (debe caber en n_ctx junto al prompt).
    ask_data_max_tokens_sql: int = Field(default=384, ge=64, le=8192)
    ask_data_max_tokens_answer: int = Field(default=768, ge=64, le=8192)
    # Respuesta final desde filas BD (sin 2.ª llamada LLM): más rápido y sin alucinar cifras/nombres.
    ask_data_use_deterministic_answer: bool = Field(default=True)
    # Enviar solo tablas relevantes a la pregunta (reduce tokens y acelera la inferencia).
    ask_data_schema_routing: bool = Field(default=True)
    ask_data_schema_max_tables: int = Field(default=15, ge=4, le=40)
    ask_data_temperature_sql_cap: float = Field(default=0.1, ge=0.0, le=1.0)
    # Perfil modelo ligero (p. ej. lfm2.5-1.2b): prompts cortos, esquema filtrado, respuesta determinista.
    light_model_mode: bool = Field(
        default=False,
        description="Forzar perfil ligero; si false, se infiere por light_model_patterns y DEFAULT_MODEL",
    )
    light_model_patterns: list[str] = Field(
        default_factory=lambda: ["1.2b", "1b", "lfm2", "lfm", "small", "tiny"],
    )
    light_model_use_deterministic_answer: bool = Field(
        default=True,
        description="Deprecated: usar ask_data_use_deterministic_answer",
    )
    light_model_max_schema_tables: int = Field(default=12, ge=4, le=40)
    light_model_temperature_sql: float = Field(default=0.0, ge=0.0, le=1.0)
    light_model_temperature_answer: float = Field(default=0.0, ge=0.0, le=1.0)
    light_model_max_tokens_sql: int = Field(default=256, ge=64, le=2048)
    light_model_max_tokens_answer: int = Field(default=256, ge=64, le=2048)
    # Server configuration
    app_name: str = Field(default="modelo_api")
    api_prefix: str = Field(default="/v1")
    enable_cors: bool = Field(default=True)
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"])

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore")


def get_settings() -> Settings:
    return Settings()

