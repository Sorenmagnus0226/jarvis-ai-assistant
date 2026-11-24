from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .config import APP_ROOT, CORS_ORIGINS, DEFAULT_MODEL, DEFAULT_PROVIDER
from .database import Base, engine, get_db
from .models import Conversation, Message
from .providers import ProviderError, available_providers, chat_completion
from .schemas import ChatRequest, ConversationResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Jarvis AI Assistant", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"], allow_credentials=False)


@app.get("/api/health")
def health():
    return {"status": "ok", "providers": available_providers()}


@app.get("/api/providers")
def providers():
    return {"providers": available_providers(), "default_provider": DEFAULT_PROVIDER, "default_model": DEFAULT_MODEL}


@app.get("/api/conversations")
def list_conversations(db: Session = Depends(get_db)):
    rows = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    return [{"id": row.id, "title": row.title, "updated_at": row.updated_at} for row in rows]


@app.get("/api/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    row = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not row:
        raise HTTPException(404, "Conversation not found")
    return ConversationResponse(id=row.id, title=row.title, messages=[{"id": m.id, "role": m.role, "content": m.content, "provider": m.provider, "model": m.model} for m in row.messages])


@app.post("/api/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    conversation = None
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
    model = request.model
    db.add(Message(conversation_id=conversation.id, role="user", content=request.message, provider=provider, model=model))
    db.commit()

    history = db.query(Message).filter(Message.conversation_id == conversation.id).order_by(Message.created_at.asc()).all()
    messages = [{"role": m.role, "content": m.content} for m in history]

    try:
        answer, resolved_model = await chat_completion(provider, model, messages)
    except ProviderError as exc:
        raise HTTPException(502, str(exc))

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
