## Backend

The backend is a FastAPI service with SQLite conversation and message storage. It adds server-side provider credentials and supports OpenAI-compatible APIs plus Claude and Gemini adapters. For desktop use, `desktop.py` starts the API on loopback and opens the frontend in a native webview.

### Desktop setup

See [README.md](README.md) for source setup, native webview requirements, smoke tests, and PyInstaller test-bundle commands.

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

Credentials are read from environment variables or a local, untracked `.env`. Never package or commit `.env` or provider keys. Database files are stored in the per-user app-data directory by default.
