from typing import Literal, Any
from pydantic import BaseModel, Field


Role = Literal["system", "user", "assistant", "tool"]


class ChatMessage(BaseModel):
    role: Role = Field(description="Role of the message in the conversation")
    content: str = Field(description="Text content of the message")


class ChatRequest(BaseModel):
    model: str | None = Field(default=None, description="Model id; defaults to server setting if omitted")
    messages: list[ChatMessage] = Field(default_factory=list)
    temperature: float | None = Field(default=0.7)
    max_tokens: int | None = Field(default=None)
    stream: bool = Field(default=False, description="If true, response will stream as Server-Sent Events")


class ChatChoiceMessage(BaseModel):
    role: Role
    content: str


class Usage(BaseModel):
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class ChatResponse(BaseModel):
    model: str
    message: ChatChoiceMessage
    usage: Usage | None = None
    raw: Any | None = None

