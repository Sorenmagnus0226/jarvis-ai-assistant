from __future__ import annotations

import httpx

from .config import (
    ANTHROPIC_API_KEY,
    DEEPSEEK_API_KEY,
    GEMINI_API_KEY,
    GROQ_API_KEY,
    OLLAMA_BASE_URL,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENROUTER_API_KEY,
)


PROVIDERS = {
    "openai": {"base_url": OPENAI_BASE_URL, "api_key": OPENAI_API_KEY, "default_model": "gpt-4o-mini"},
    "deepseek": {"base_url": "https://api.deepseek.com", "api_key": DEEPSEEK_API_KEY, "default_model": "deepseek-chat"},
    "groq": {"base_url": "https://api.groq.com/openai/v1", "api_key": GROQ_API_KEY, "default_model": "llama-3.3-70b-versatile"},
    "openrouter": {"base_url": "https://openrouter.ai/api/v1", "api_key": OPENROUTER_API_KEY, "default_model": "openai/gpt-4o-mini"},
    "ollama": {"base_url": OLLAMA_BASE_URL, "api_key": None, "default_model": "llama3.2"},
}


class ProviderError(RuntimeError):
    pass


def available_providers() -> list[dict]:
    result = []
    for name, config in PROVIDERS.items():
        result.append({"name": name, "configured": bool(config["api_key"] or name == "ollama"), "default_model": config["default_model"]})
    result.extend([
        {"name": "claude", "configured": bool(ANTHROPIC_API_KEY), "default_model": "claude-3-5-sonnet-latest"},
        {"name": "gemini", "configured": bool(GEMINI_API_KEY), "default_model": "gemini-2.0-flash"},
    ])
    return result


async def chat_completion(provider: str, model: str | None, messages: list[dict]) -> tuple[str, str]:
    provider = provider.lower()

    if provider in ("claude", "anthropic"):
        if not ANTHROPIC_API_KEY:
            raise ProviderError("ANTHROPIC_API_KEY is not configured")
        model = model or "claude-3-5-sonnet-latest"
        system = "\n".join(m["content"] for m in messages if m["role"] == "system")
        user_messages = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]
        payload = {"model": model, "max_tokens": 1024, "messages": user_messages}
        if system:
            payload["system"] = system
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post("https://api.anthropic.com/v1/messages", headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"}, json=payload)
        if response.is_error:
            raise ProviderError(f"Claude error {response.status_code}: {response.text[:300]}")
        data = response.json()
        return "".join(part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"), model

    if provider in ("gemini", "google"):
        if not GEMINI_API_KEY:
            raise ProviderError("GEMINI_API_KEY is not configured")
        model = model or "gemini-2.0-flash"
        contents = [{"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]} for m in messages if m["role"] != "system"]
        payload = {"contents": contents}
        system = next((m["content"] for m in messages if m["role"] == "system"), None)
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(url, params={"key": GEMINI_API_KEY}, json=payload)
        if response.is_error:
            raise ProviderError(f"Gemini error {response.status_code}: {response.text[:300]}")
        candidates = response.json().get("candidates", [])
        text = "".join(part.get("text", "") for part in candidates[0].get("content", {}).get("parts", [])) if candidates else ""
        return text, model

    config = PROVIDERS.get(provider)
    if not config:
        raise ProviderError(f"Unknown provider: {provider}")
    if not config["api_key"] and provider != "ollama":
        raise ProviderError(f"Credentials for {provider} are not configured")

    model = model or config["default_model"]
    headers = {"content-type": "application/json"}
    if config["api_key"]:
        headers["authorization"] = f"Bearer {config['api_key']}"

    if provider == "ollama":
        payload = {"model": model, "messages": messages, "stream": False}
        url = f"{config['base_url'].rstrip('/')}/api/chat"
    else:
        payload = {"model": model, "messages": messages, "stream": False}
        url = f"{config['base_url'].rstrip('/')}/chat/completions"

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, headers=headers, json=payload)
    if response.is_error:
        raise ProviderError(f"{provider} error {response.status_code}: {response.text[:300]}")

    data = response.json()
    if provider == "ollama":
        text = data.get("message", {}).get("content", "")
    else:
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return text, model
