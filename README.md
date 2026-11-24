# Jarvis AI Assistant

A privacy-conscious personal AI workspace. The repository now includes a **desktop app launcher** for installation-style local testing, plus the FastAPI backend and web UI. The desktop launcher runs the API on a loopback-only address and opens it in a native window; provider credentials remain on your computer.

## Run the desktop app from source

Python 3.10 or later is recommended.

1. Clone or download this repository.
2. Install Python dependencies:

   ```bash
   python -m venv .venv
   # Windows PowerShell: .venv\\Scripts\\Activate.ps1
   # macOS/Linux: source .venv/bin/activate
   python -m pip install -r requirements-desktop.txt
   ```
3. Copy `.env.example` to `.env` and add a provider key (for example `OPENAI_API_KEY=...`) if you want cloud chat. Ollama can be used locally if installed and running; no API key is needed for it.
4. Launch the native window:

   ```bash
   python desktop.py
   ```

The SQLite database is stored in the operating system's per-user application data directory. Override it with `JARVIS_DATA_DIR` if desired. The desktop API binds only to `127.0.0.1` and uses an available local port.

### Native webview requirements

`pywebview` uses a platform webview. Windows requires WebView2 (normally present on current Windows 10/11); macOS uses the system WebKit webview; Linux needs GTK and WebKitGTK development/runtime packages. If the native window cannot start on Linux, install the WebKitGTK and GTK packages for your distribution, then reinstall `requirements-desktop.txt`.

## Build a test executable

Build on the same operating system you want to package (PyInstaller does not cross-compile). With the virtual environment activated and `requirements-desktop.txt` installed:

**Windows (PowerShell):**

```powershell
python -m pip install pyinstaller
pyinstaller --noconfirm --clean --windowed --name Jarvis --collect-all webview --collect-all sqlalchemy --add-data "index.html;." --add-data "styles.css;." --add-data "app.js;." desktop.py
```

**macOS/Linux:**

```bash
python -m pip install pyinstaller
pyinstaller --noconfirm --clean --windowed --name Jarvis --collect-all webview --collect-all sqlalchemy --add-data "index.html:." --add-data "styles.css:." --add-data "app.js:." desktop.py
```

The test build is placed in `dist/Jarvis/` (or `dist/Jarvis.app` on macOS). Run it on the machine used to build it. PyInstaller output is a test bundle, not a signed/notarized production installer. Distribute installers only after testing on clean machines and signing them appropriately. Keep `.env` and API keys out of packaged builds.

## Run the backend or browser preview

For API development without the native window:

```bash
python -m pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for API docs. To see the static UI only, open `index.html` or use a static file server.

## Smoke tests

```bash
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

## Current status

The desktop shell, local API, SQLite conversation storage, and provider adapters are present. The interface remains an early prototype: most feature cards and voice, automation, integrations, and system-control actions are placeholders. Configure a provider in `.env` for API-level chat testing; never commit secrets. Future device actions and integrations should be opt-in and require explicit user confirmation.

## Roadmap

- **Voice & AI:** Gemini Live streaming, optional “Hey Jarvis” wake word, Whisper-compatible speech-to-text, ElevenLabs/Piper/system speech, voice profiles, and a provider interface for OpenAI, Claude, Gemini, DeepSeek, Groq, Ollama, and OpenRouter.
- **Smart Jarvis:** user-controlled memory, context assembly, teaching mode, web research, source-based fact checking, and document analysis.
- **Automation:** supervised routines, background jobs, computer workflows, vision, recovery, and task orchestration.
- **Avatar:** customizable 3D avatar, expressions, gestures, and lip-sync.
- **Connected services:** YouTube, Discord, WhatsApp, Telegram, Gmail, Calendar, smart-home services, and phone dashboard.
- **System tools & customization:** monitoring, file/document/image operations, prompts, themes, hotkeys, languages, and fonts.

## License

MIT. See [LICENSE](LICENSE).
