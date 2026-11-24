## Backend

The backend is a FastAPI service named **Kaizen AI Assistant**. It uses SQLite conversation and message storage and supports OpenAI-compatible providers plus Claude and Gemini adapters.

The desktop launcher starts the API only on loopback and opens the frontend in a native webview.

### API

- `GET /api/health`
- `GET /api/providers`
- `GET /api/conversations`
- `GET /api/conversations/{id}`
- `POST /api/chat`
- `DELETE /api/conversations/{id}`

Credentials remain outside source control in `.env` or process memory. Database and app data use the `Kaizen AI Assistant` application directory unless `KAIZEN_DATA_DIR` is set.
