import io

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .config import APP_ROOT, CORS_ORIGINS, DEFAULT_MODEL, DEFAULT_PROVIDER
from .database import Base, engine, get_db
from .models import Conversation, Message, Memory, Document
from .providers import ProviderError, available_providers, chat_completion, configure_provider
from .schemas import ChatRequest, ConversationResponse, ProviderSettingsRequest, MemoryRequest

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Jarvis AI Assistant", version="0.2.0")
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
    if name in ("anthropic",): name = "claude"
    if name in ("google",): name = "gemini"
    if name not in {item["name"] for item in available_providers()}:
        raise HTTPException(404, "Unknown provider")
    api_key = settings.api_key.strip() if settings.api_key else None
    model = settings.model.strip() if settings.model else None
    if api_key is not None and (len(api_key) < 8 or any(ch.isspace() for ch in api_key)):
        raise HTTPException(422, "Enter a valid API key without whitespace")
    configure_provider(name, api_key=api_key, model=model)
    selected = next(item for item in available_providers() if item["name"] == name)
    return {"name": selected["name"], "configured": selected["configured"], "default_model": selected["default_model"]}


@app.get("/api/memories")
def list_memories(db: Session = Depends(get_db)):
    rows = db.query(Memory).order_by(Memory.created_at.desc()).all()
    return [{"id": r.id, "content": r.content, "category": r.category, "enabled": r.enabled} for r in rows]


@app.post("/api/memories")
def add_memory(request: MemoryRequest, db: Session = Depends(get_db)):
    row = Memory(content=request.content.strip(), category=request.category.strip().lower() or "general")
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "content": row.content, "category": row.category, "enabled": row.enabled}


@app.delete("/api/memories/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db)):
    row = db.query(Memory).filter(Memory.id == memory_id).first()
    if not row: raise HTTPException(404, "Memory not found")
    db.delete(row); db.commit()
    return {"deleted": memory_id}


@app.post("/api/documents", status_code=201)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    allowed = {".txt", ".md", ".csv", ".json", ".log", ".yaml", ".yml"}
    name = file.filename or "document.txt"
    suffix = "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if suffix not in allowed:
        raise HTTPException(415, "Supported text formats: TXT, MD, CSV, JSON, LOG, YAML")
    raw = await file.read()
    if len(raw) > 2_000_000:
        raise HTTPException(413, "Document exceeds the 2 MB limit")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(415, "Document must be UTF-8 text")
    text = text[:500_000]
    row = Document(name=name[:255], media_type=file.content_type or "text/plain", content=text)
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "name": row.name, "bytes": len(raw), "characters": len(text)}


@app.get("/api/documents")
def list_documents(db: Session = Depends(get_db)):
    rows = db.query(Document).order_by(Document.created_at.desc()).all()
    return [{"id": r.id, "name": r.name, "characters": len(r.content)} for r in rows]


@app.delete("/api/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    row = db.query(Document).filter(Document.id == document_id).first()
    if not row: raise HTTPException(404, "Document not found")
    db.delete(row); db.commit()
    return {"deleted": document_id}


@app.get("/api/conversations")
def list_conversations(db: Session = Depends(get_db)):
    rows = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    return [{"id": r.id, "title": r.title, "updated_at": r.updated_at} for r in rows]


@app.get("/api/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    row = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not row: raise HTTPException(404, "Conversation not found")
    return ConversationResponse(id=row.id, title=row.title, messages=[{"id": m.id, "role": m.role, "content": m.content, "provider": m.provider, "model": m.model} for m in row.messages])


@app.post("/api/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    if request.conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
        if not conversation: raise HTTPException(404, "Conversation not found")
    else:
        title = request.message.strip().replace("\n", " ")[:60]
        conversation = Conversation(title=title or "New conversation")
        db.add(conversation); db.flush()

    provider = (request.provider or DEFAULT_PROVIDER).lower()
    db.add(Message(conversation_id=conversation.id, role="user", content=request.message, provider=provider, model=request.model)); db.commit()
    history = db.query(Message).filter(Message.conversation_id == conversation.id).order_by(Message.created_at.asc()).all()

    memories = db.query(Memory).filter(Memory.enabled.is_(True)).order_by(Memory.created_at.desc()).limit(30).all()
    documents = db.query(Document).order_by(Document.created_at.desc()).limit(5).all()
    context_parts = []
    if memories:
        context_parts.append("Enabled user memories:\n" + "\n".join(f"- [{m.category}] {m.content}" for m in memories))
    if documents:
        context_parts.append("Available local documents (use only relevant excerpts; do not claim facts outside these documents):\n" + "\n\n".join(f"[{d.name}]\n{d.content[:12_000]}" for d in documents))
    messages = ([{"role": "system", "content": "\n\n".join(context_parts)}] if context_parts else [])
    messages += [{"role": m.role, "content": m.content} for m in history]

    try:
        answer, resolved_model = await chat_completion(provider, request.model, messages)
    except ProviderError as exc:
        raise HTTPException(502, str(exc)) from exc

    assistant = Message(conversation_id=conversation.id, role="assistant", content=answer, provider=provider, model=resolved_model)
    db.add(assistant); db.commit(); db.refresh(assistant)
    return {"conversation_id": conversation.id, "provider": provider, "model": resolved_model, "message": {"id": assistant.id, "role": "assistant", "content": assistant.content, "provider": provider, "model": resolved_model}}


@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    row = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not row: raise HTTPException(404, "Conversation not found")
    db.delete(row); db.commit()
    return {"deleted": conversation_id}


app.mount("/", StaticFiles(directory=str(APP_ROOT), html=True), name="frontend")
