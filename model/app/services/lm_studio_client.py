import json
import httpx
from app.config import Settings, get_settings


def _headers(api_key: str | None) -> dict[str, str]:
    if not api_key:
        return {}
    return {"Authorization": f"Bearer {api_key}"}


def _lm_studio_error_body(resp: httpx.Response) -> str:
    text = (resp.text or "").strip()
    if not text:
        return "(sin cuerpo en la respuesta)"
    try:
        data = resp.json()
        err = data.get("error")
        if isinstance(err, dict) and err.get("message"):
            return str(err["message"])
        if isinstance(err, str):
            return err
    except (json.JSONDecodeError, TypeError):
        pass
    return text[:4000]


async def complete_chat_text(
    client: httpx.AsyncClient,
    *,
    messages: list[dict[str, str]],
    settings: Settings | None = None,
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int | None = 2048,
) -> str:
    cfg = settings or get_settings()
    payload: dict = {
        "model": model or cfg.default_model,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    url = f"{cfg.lm_studio_base_url}/chat/completions"
    resp = await client.post(url, json=payload, headers=_headers(cfg.lm_studio_api_key), timeout=None)
    if resp.status_code != 200:
        detail = _lm_studio_error_body(resp)
        raise httpx.HTTPStatusError(
            f"LM Studio {resp.status_code}: {detail}",
            request=resp.request,
            response=resp,
        )
    data = resp.json()
    choice = data.get("choices", [{}])[0]
    message = choice.get("message") or {}
    content = message.get("content", "")
    return content if isinstance(content, str) else json.dumps(content, ensure_ascii=False)
