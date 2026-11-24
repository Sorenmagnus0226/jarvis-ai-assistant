from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=32_000)
    conversation_id: int | None = None
    provider: str | None = None
    model: str | None = None


class ProviderSettingsRequest(BaseModel):
    api_key: str | None = Field(default=None, max_length=512)
    model: str | None = Field(default=None, min_length=1, max_length=160)


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    provider: str | None = None
    model: str | None = None


class ConversationResponse(BaseModel):
    id: int
    title: str
    messages: list[MessageResponse]
