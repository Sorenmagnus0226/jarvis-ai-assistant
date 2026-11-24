# Kaizen AI Assistant

A privacy-conscious personal AI workspace for desktop and browser use.

## Run from source

Python 3.10 or later is recommended.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-desktop.txt
python desktop.py
```

Configure provider credentials through `.env` or the future secure settings interface. The SQLite database is stored under the operating-system application-data directory. Override it with `KAIZEN_DATA_DIR` if needed.

## Build a test executable

```powershell
python -m pip install pyinstaller
pyinstaller --noconfirm --clean --windowed --name Kaizen --collect-all webview --collect-all sqlalchemy --add-data "index.html;." --add-data "styles.css;." --add-data "app.js;." desktop.py
```

## Run backend tests

```powershell
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
```

## Status

Kaizen provides the desktop shell, local loopback API, SQLite conversations, provider adapters, provider/model configuration groundwork, local memory, and document context. External integrations and autonomous system actions remain opt-in and require explicit implementation and authorization.

## Roadmap

- Voice and AI
- Smart Kaizen memory and document analysis
- Supervised automation
- Avatar expressions and lip-sync
- Connected services
- System tools and customization
