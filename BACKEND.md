## Backend

The backend is a FastAPI service with SQLite conversation and message storage. It adds secure server-side provider credentials and supports OpenAI-compatible APIs plus Claude and Gemini adapters.

### Run

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add only the credentials you intend to use to .env
uvicorn backend.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for the API documentation and `http://127.0.0.1:8000` for the frontend.

### API

- `GET /api/health` — service and provider status
- `GET /api/providers` — available providers and defaults
- `GET /api/conversations` — conversation summaries
- `GET /api/conversations/{id}` — conversation and messages
- `POST /api/chat` — create or continue a conversation
- `DELETE /api/conversations/{id}` — delete one conversation

Example:

```bash
curl -X POST http://127.0.0.1:8000/api/chat \
  -H 'content-type: application/json' \
  -d '{"message":"Hello Jarvis","provider":"openai","model":"gpt-4o-mini"}'
```

Credentials are read only from environment variables. Never commit `.env` or provider keys. The SQLite file belongs under `backend/data/` and should not be committed.
