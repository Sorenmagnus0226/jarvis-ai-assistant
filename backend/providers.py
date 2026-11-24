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


# Credentials and model overrides supplied from the local desktop settings UI live
# only for the lifetime of the backend process. They are never written to disk.
PROVIDERS = {
    "openai": {"base_url": OPENAI_BASE_URL, "api_key": OPENAI_API_KEY, "default_model": "gpt-4o-mini"},
    "deepseek": {"base_url": "https://api.deepseek.com", "api_key": DEEPSEEK_API_KEY, "default_model": "deepseek-chat"},
    "groq": {"base_url": "https://api.groq.com/openai/v1", "api_key": GROQ_API_KEY, "default_model": "llama-3.3-70b-versatile"},
    "openrouter": {"base_url": "https://openrouter.ai/api/v1", "api_key": OPENROUTER_API_KEY, "default_model": "openai/gpt-4o-mini"},
    "ollama": {"base_url": OLLAMA_BASE_URL, "api_key": None, "default_model": "llama3.2"},
    "claude": {"base_url": "https://api.anthropic.com", "api_key": ANTHROPIC_API_KEY, "default_model": "claude-3-5-sonnet-latest"},
    "gemini": {"base_url": "https://generativelanguage.googleapis.com", "api_key": GEMINI_API_KEY, "default_model": "gemini-2.0-flash"},
}


def configure_provider(name: str, api_key: str | None = None, model: str | None = None) -> None:
    provider = PROVIDERS[name]
    if api_key:
        provider["api_key"] = api_key
    if model:
        provider["default_model"] = model


def available_providers() -> list[dict]:
    return [
        {
            "name": name,
            "configured": bool(item["api_key"] or name == "ollama"),
            "default_model": item["default_model"],
        }
        for name, item in PROVIDERS.items()
    ]


class ProviderError(RuntimeError):
    pass


async def chat_completion(provider: str, model: str | None, messages: list[dict]) -> tuple[str, str]:
    provider = provider.lower()
    if provider == "anthropic":
        provider = "claude"
    if provider == "google":
        provider = "gemini"
    config = PROVIDERS.get(provider)
    if not config:
        raise ProviderError(f"Unknown provider: {provider}")

    api_key = config["api_key"]
    if provider != "ollama" and not api_key:
        raise ProviderError(f"Credentials for {provider} are not configured. Open Settings to add your provider key.")

    model = model or config["default_model"]
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            if provider == "claude":
                system = "\n".join(item["content"] for item in messages if item["role"] == "system")
                payload = {
                    "model": model,
                    "max_tokens": 1024,
                    "messages": [{"role": item["role"], "content": item["content"]} for item in messages if item["role"] != "system"],
                }
                if system:
                    payload["system"] = system
                response = await client.post(
                    f"{config['base_url']}/v1/messages",
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
                    json=payload,
                )
                if response.is_error:
                    raise ProviderError(f"Claude returned HTTP {response.status_code}. Check the key and model in Settings.")
                data = response.json()
                return "".join(part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"), model

            if provider == "gemini":
                contents = [
                    {"role": "user" if item["role"] == "user" else "model", "parts": [{"text": item["content"]}]}
                    for item in messages if item["role"] != "system"
                ]
                payload = {"contents": contents}
                system = next((item["content"] for item in messages if item["role"] == "system"), None)
                if system:
                    payload["systemInstruction"] = {"parts": [{"text": system}]}
                response = await client.post(
                    f"{config['base_url']}/v1beta/models/{model}:generateContent",
                    params={"key": api_key},
                    json=payload,
                )
                if response.is_error:
                    raise ProviderError(f"Gemini returned HTTP {response.status_code}. Check the key and model in Settings.")
                candidates = response.json().get("candidates", [])
                text = "".join(part.get("text", "") for part in candidates[0].get("content", {}).get("parts", [])) if candidates else ""
                return text, model

            headers = {"content-type": "application/json"}
            if api_key:
                headers["authorization"] = f"Bearer {api_key}"
            if provider == "ollama":
                url = f"{config['base_url'].rstrip('/')}/api/chat"
                payload = {"model": model, "messages": messages, "stream": False}
            else:
                url = f"{config['base_url'].rstrip('/')}/chat/completions"
                payload = {"model": model, "messages": messages, "stream": False}
            response = await client.post(url, headers=headers, json=payload)
            if response.is_error:
                raise ProviderError(f"{provider} returned HTTP {response.status_code}. Check credentials, model, and service availability.")
            data = response.json()
            if provider == "ollama":
                text = data.get("message", {}).get("content", "")
            else:
                text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return text, model
    except httpx.RequestError as exc:
        raise ProviderError(f"Could not connect to {provider}. Check your network or local provider service.") from exc
