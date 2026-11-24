from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from platformdirs import user_data_dir

if getattr(sys, "frozen", False):
    APP_ROOT = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
else:
    APP_ROOT = Path(__file__).resolve().parent.parent

load_dotenv(APP_ROOT / ".env")

DATA_DIR = Path(os.getenv("JARVIS_DATA_DIR", user_data_dir("Jarvis AI Assistant", appauthor=False)))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'jarvis.db'}")
DEFAULT_PROVIDER = os.getenv("AI_PROVIDER", "openai")
DEFAULT_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000").split(",")]
