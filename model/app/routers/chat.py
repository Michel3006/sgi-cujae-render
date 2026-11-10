from typing import AsyncIterator
import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.config import get_settings
from app.dependencies.http_client import get_http_client
from app.schemas.chat import ChatRequest, ChatResponse, ChatChoiceMessage, Usage


router = APIRouter(tags=["chat"])


def _headers(api_key: str | None) -> dict[str, str]:
    if not api_key:
        return {}
    return {"Authorization": f"Bearer {api_key}"}


@router.post("/chat", response_model=ChatResponse, responses={200: {"description": "Chat completion"}})
async def chat(
    body: ChatRequest,
    client: httpx.AsyncClient = Depends(get_http_client),
) -> ChatResponse:
    settings = get_settings()
    payload: dict = {
        "model": body.model or settings.default_model,
        "messages": [m.model_dump() for m in body.messages],
        "stream": False,
    }
    if body.temperature is not None:
        payload["temperature"] = body.temperature
    if body.max_tokens is not None:
        payload["max_tokens"] = body.max_tokens

    url = f"{settings.lm_studio_base_url}/chat/completions"
    resp = await client.post(url, json=payload, headers=_headers(settings.lm_studio_api_key), timeout=None)
    resp.raise_for_status()
    data = resp.json()

    choice = data.get("choices", [{}])[0]
    message = choice.get("message") or {}
    usage = data.get("usage") or {}

    return ChatResponse(
        model=data.get("model") or payload["model"],
        message=ChatChoiceMessage(role=message.get("role", "assistant"), content=message.get("content", "")),
        usage=Usage(**usage) if usage else None,
        raw=data,
    )


@router.post("/chat/stream")
async def chat_stream(
    body: ChatRequest,
    client: httpx.AsyncClient = Depends(get_http_client),
) -> StreamingResponse:
    settings = get_settings()
    payload: dict = {
        "model": body.model or settings.default_model,
        "messages": [m.model_dump() for m in body.messages],
        "stream": True,
    }
    if body.temperature is not None:
        payload["temperature"] = body.temperature
    if body.max_tokens is not None:
        payload["max_tokens"] = body.max_tokens
    url = f"{settings.lm_studio_base_url}/chat/completions"

    async def event_source() -> AsyncIterator[bytes]:
        async with client.stream("POST", url, json=payload, headers=_headers(settings.lm_studio_api_key), timeout=None) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line:
                    continue
                # Proxy LM Studio's SSE stream as-is
                yield (line + "\n").encode("utf-8")

    return StreamingResponse(event_source(), media_type="text/event-stream")

