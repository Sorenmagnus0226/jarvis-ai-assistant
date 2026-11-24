from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .config import APP_ROOT, CORS_ORIGINS, DEFAULT_MODEL, DEFAULT_PROVIDER
from .database import Base, engine, get_db
from .models import Conversation, Message
from .providers import ProviderError, available_providers, chat_completion, configure_provider
from .schemas import ChatRequest, ConversationResponse, ProviderSettingsRequest

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Jarvis AI Assistant", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"], allow_credentials=False)


@app.get("/api/health")
def health():
    return {"status": "ok", "providers": available_providers()}


@app.get("/api/providers")
def providers():
    return {"providers": available_providers(), "default_provider": DEFAULT_PROVIDER, "default_model": DEFAULT_MODEL}


@app.put("/api/providers/{provider_name}/settings")
def update_provider_settings(provider_name: str, settings: ProviderSettingsRequest):
    name = provider_name.lower()
    if name == "anthropic":
        name = "claude"
    if name == "google":
        name = "gemini"
    if name not in {item["name"] for item in available_providers()}:
        raise HTTPException(404, "Unknown provider")
    api_key = settings.api_key.strip() if settings.api_key else None
    model = settings.model.strip() if settings.model else None
    if api_key is not None and (len(api_key) < 8 or any(character.isspace() for character in api_key)):
        raise HTTPException(422, "Enter a valid API key without whitespace, or leave the key blank to keep the current key.")
    if name == "ollama" and api_key:
        raise HTTPException(422, "Ollama runs locally and does not use an API key here.")
    configure_provider(name, api_key=api_key, model=model)
    selected = next(item for item in available_providers() if item["name"] == name)
    # Never echo credential contents to the UI or logs.
    return {"name": selected["name"], "configured": selected["configured"], "default_model": selected["default_model"]}


@app.get("/api/conversations")
def list_conversations(db: Session = Depends(get_db)):
    rows = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    return [{"id": row.id, "title": row.title, "updated_at": row.updated_at} for row in rows]


@app.get("/api/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    row = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not row:
        raise HTTPException(404, "Conversation not found")
    return ConversationResponse(id=row.id, title=row.title, messages=[{"id": message.id, "role": message.role, "content": message.content, "provider": message.provider, "model": message.model} for message in row.messages])


@app.post("/api/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    if request.conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
        if not conversation:
            raise HTTPException(404, "Conversation not found")
    else:
        title = request.message.strip().replace("\n", " ")[:60]
        conversation = Conversation(title=title or "New conversation")
        db.add(conversation)
        db.flush()

    provider = (request.provider or DEFAULT_PROVIDER).lower()
    db.add(Message(conversation_id=conversation.id, role="user", content=request.message, provider=provider, model=request.model))
    db.commit()
    history = db.query(Message).filter(Message.conversation_id == conversation.id).order_by(Message.created_at.asc()).all()
    messages = [{"role": message.role, "content": message.content} for message in history]
    try:
        answer, resolved_model = await chat_completion(provider, request.model, messages)
    except ProviderError as exc:
        raise HTTPException(502, str(exc)) from exc

    assistant = Message(conversation_id=conversation.id, role="assistant", content=answer, provider=provider, model=resolved_model)
    db.add(assistant)
    db.commit()
    db.refresh(assistant)
    return {"conversation_id": conversation.id, "provider": provider, "model": resolved_model, "message": {"id": assistant.id, "role": "assistant", "content": assistant.content, "provider": provider, "model": resolved_model}}


@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    row = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not row:
        raise HTTPException(404, "Conversation not found")
    db.delete(row)
    db.commit()
    return {"deleted": conversation_id}


app.mount("/", StaticFiles(directory=str(APP_ROOT), html=True), name="frontend")
