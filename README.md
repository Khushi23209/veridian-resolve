# Veridian Resolve

Evidence-first internal IT service desk agent for the Veridian Corp assignment.

## Features

- Natural-language IT issue input
- 15 supplied assignment requests
- Conversational follow-up questions with context
- Policy evidence and historical precedent
- Policy interaction detection
- Agent Replay
- Batch Triage
- Knowledge Base search
- Audit Trail
- Optional Groq/OpenAI-compatible LLM
- Grounded deterministic fallback when no API key is configured

## Run locally

### Backend

```bash
cd server
npm install
npm run dev
```

Backend runs on `http://localhost:8000`.

### Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Optional AI model

Edit `server/.env`:

```env
PORT=8000
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

The app works without a key using the grounded fallback rules.

## Important

Only the supplied Veridian assignment data is used as source material. The agent is designed not to invent unsupported policies or procedures.
