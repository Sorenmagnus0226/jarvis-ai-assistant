# Jarvis AI Assistant

A voice-first personal AI workspace, designed to grow into a privacy-conscious assistant for conversation, memory, research, automation, integrations, and system tools.

## Current status

The repository currently contains a responsive, interactive **frontend prototype** built with plain HTML, CSS, and JavaScript. It previews the workspace and its feature areas; it does not yet connect to AI providers, access the microphone, store memories, control the computer, or connect external accounts. Buttons that represent unfinished features explain their setup status rather than performing those actions.

## Run locally

No build step or dependencies are required. Open `index.html` in a browser, or serve this directory with any static file server, for example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Roadmap

- **Voice & AI:** Gemini Live streaming, optional “Hey Jarvis” wake word, Whisper-compatible speech-to-text, ElevenLabs/Piper/system speech, voice profiles, and a provider interface for OpenAI, Claude, Gemini, DeepSeek, Groq, Ollama, and OpenRouter.
- **Smart Jarvis:** user-controlled long-term memory, context assembly, teaching mode, web research, source-based fact checking, document analysis, and opt-in proactive suggestions.
- **Automation:** background jobs, scheduled routines, computer workflows, vision, recovery, and sequential/parallel task orchestration. Actions that affect files, accounts, or the device should be permission-scoped, visible, and confirmed by the user.
- **Avatar:** customizable 3D holographic avatar, expressions, gestures, lip-sync, and live visual states.
- **Connected services:** YouTube, Discord, WhatsApp, Telegram, Gmail, Google Calendar, smart-home services, and a phone dashboard. Each service needs its own explicit authorization and permission review.
- **System tools:** resource monitoring, display and network utilities, file operations, office/PDF document tools, and image processing, behind explicit user consent and platform permissions.
- **Customization:** prompts, themes, hotkeys, language packs (goal: 50+), and fonts.

## Implementation principles

1. Keep provider credentials on a trusted backend; never put API keys in browser code or commit them to the repository.
2. Make microphone use, memory, integrations, and automation opt-in, with visible status and easy ways to pause or revoke access.
3. Require confirmation for consequential actions such as sending messages, changing files, or controlling devices.
4. Minimize retained data; give users controls to inspect, export, and delete stored information.
5. Treat external content and documents as untrusted input.

## Next milestone

Add a backend API and secure provider configuration, then connect a single text-chat provider end to end before expanding to voice, memory, or automation. Keep integrations behind explicit consent and document the data each integration can access.

## License

MIT. See [LICENSE](LICENSE).
