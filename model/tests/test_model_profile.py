from app.config import Settings
from app.services.model_profile import is_light_model, sql_temperature


def test_detects_lfm_1_2b() -> None:
    s = Settings(default_model="lfm2.5-1.2b-instruct")
    assert is_light_model("lfm2.5-1.2b-instruct", s)


def test_heavy_model_not_light() -> None:
    s = Settings(default_model="llama-3.1-8b")
    assert not is_light_model("llama-3.1-8b", s)


def test_light_model_zero_sql_temperature() -> None:
    s = Settings()
    assert sql_temperature(s, 0.3, light=True) == 0.0


def test_heavy_model_sql_temperature_capped() -> None:
    s = Settings()
    assert sql_temperature(s, 0.3, light=False) == 0.1
