# Veridian Resolve

**Evidence-first internal IT service desk agent for Veridian Corp — Assignment 2**

Veridian Resolve turns employee IT requests into actionable, policy-grounded decisions. It is designed around the supplied Veridian assignment knowledge base, employee requests, and historical ticket data rather than inventing unsupported company policies.

## Live Demo

**Frontend:** https://veridian-resolve-ggrame1g2-khushi23209s-projects.vercel.app

**Backend API:** https://veridian-resolve.onrender.com

**GitHub:** https://github.com/Khushi23209/veridian-resolve

The frontend is deployed on **Vercel** and the Node/Express backend is deployed on **Render**.

## What It Does

- Natural-language IT issue input
- 15 supplied assignment requests (REQ-01 to REQ-15)
- Conversational follow-up questions with context
- Policy evidence and historical precedent
- Policy interaction detection
- Agent Replay showing the observable decision workflow
- Batch Triage across the supplied request queue
- Knowledge Base search
- Audit Trail with structured decision records
- Optional Groq-compatible LLM integration
- Grounded deterministic fallback when no API key is configured

## Key Design Principle

> **Use the supplied Veridian assignment data as the source of truth. Do not invent unsupported policies or procedures.**

The agent can use:

- **KB-01–KB-10** — supplied IT knowledge base articles
- **Asset Management Policy** — supplied hardware refresh policy
- **REQ-01–REQ-15** — supplied employee requests
- **TK-1042–TK-1051** — supplied historical ticket records

Closed historical tickets are used as context/precedent, not as new formal policy unless the source material explicitly establishes that policy.

## Architecture

```text
React + Vite frontend
        |
        | HTTP / REST
        v
Node.js + Express backend
        |
        +--> Policy / request / ticket data
        |
        +--> Agent logic
        |       |
        |       +--> policy retrieval
        |       +--> request retrieval
        |       +--> ticket history / precedent
        |       +--> deterministic validation
        |       +--> optional LLM
        |
        v
Structured Decision Record
        |
        v
Agent Replay + Audit Trail + UI response
```

## Main Workflow

```text
Request received
      ↓
Classify issue
      ↓
Retrieve relevant policy evidence
      ↓
Check historical precedent
      ↓
Detect policy interactions / approval needs
      ↓
Make grounded decision
      ↓
Create structured audit record
      ↓
Show response + evidence + Agent Replay
```

The UI exposes the observable workflow and concise evidence/rationale; it does not expose hidden chain-of-thought.

## Important Assignment Cases

### REQ-01 — Aditi's laptop

Aditi's laptop is dead and approximately 3.5 years old. The agent must recognize the interaction between **KB-03** (replacement eligibility after 3 years or earlier for verified hardware failure) and the **Asset Management Policy** (4-year standard refresh cycle; early replacement outside the cycle requires Finance sign-off in addition to IT approval).

### REQ-05 — VPN credentials

The agent can resolve an expired VPN credential request using **KB-02**. Historical ticket **TK-1042** provides precedent for an expired VPN credential case.

The conversational interface also retains context for follow-up questions such as asking how to renew the credentials.

### REQ-08 — Phishing

Security incidents are handled according to **KB-09**, including immediate reporting to `security@veridian-corp.example` and the instruction not to forward suspected phishing to other employees.

### REQ-10 — Admin access

Kavya requests admin access to the finance reporting server but provides no business justification. Historical ticket **TK-1050** is surfaced as precedent: the prior admin-access request was rejected because no business justification was provided.

### Batch Triage

The Command Center can process the supplied request portfolio and surface operational categories such as resolved/self-service, human review, approval-dependent, waiting for employee, and security escalation.

## Tech Stack

### Frontend

- React
- Vite
- Axios
- CSS / UI components

### Backend

- Node.js
- Express
- Axios / REST APIs
- Optional Groq-compatible LLM integration

## Project Structure

```text
veridian-resolve/
├── client/              # React + Vite frontend
│   └── src/
├── server/              # Node + Express backend
│   └── src/
├── README.md
└── ...
```

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/Khushi23209/veridian-resolve.git
cd veridian-resolve
```

### 2. Start the backend

```bash
cd server
npm install
npm run dev
```

The local backend runs on:

```text
http://localhost:8000
```

### 3. Start the frontend

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Environment Variables

### Backend

Optional `server/.env`:

```env
PORT=8000
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

The application remains functional without `GROQ_API_KEY` because it includes a grounded deterministic fallback.

Never commit a real API key to GitHub or place it in the frontend.

### Frontend

For the hosted frontend, the API base URL is configured with:

```env
VITE_API_URL=https://veridian-resolve.onrender.com/api
```

For local development, the frontend can fall back to the local backend at:

```text
http://localhost:8000/api
```

## Deployment

### Backend — Render

Repository:

```text
Khushi23209/veridian-resolve
```

Render configuration:

| Setting | Value |
|---|---|
| Runtime | Node |
| Branch | `main` |
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| PORT | `10000` |
| Plan | Free |

Backend URL:

```text
https://veridian-resolve.onrender.com
```

### Frontend — Vercel

Vercel configuration:

| Setting | Value |
|---|---|
| Framework | Vite / Other |
| Root Directory | `client` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| `VITE_API_URL` | `https://veridian-resolve.onrender.com/api` |

Frontend URL:

```text
https://veridian-resolve-ggrame1g2-khushi23209s-projects.vercel.app
```

## Suggested Demo Flow

1. Open the live frontend.
2. Open the Agent Chat.
3. Select **REQ-05** and submit it.
4. Ask a follow-up such as **"how do I renew?"** to demonstrate conversation context.
5. Try **REQ-01** to demonstrate policy interaction detection.
6. Try **REQ-08** to demonstrate security escalation.
7. Try **REQ-10** to demonstrate historical precedent.
8. Run **Batch Triage** to process the supplied request portfolio.
9. Open **Audit Trail** to inspect structured decision records.
10. Use **Knowledge Base** to inspect the supplied policy evidence.

## Auditability

A decision record can capture information such as:

- Request ID
- Category
- Action
- Policy evidence
- Historical evidence
- Approval status
- Human handoff / routing
- Response
- Timestamp

This makes the agent's operational decision visible and reviewable rather than treating the system as a black-box chatbot.

## Scope & Limitations

- The assignment data is the source of truth.
- Unsupported company policies should not be invented.
- Historical tickets provide context/precedent; they are not automatically formal policy.
- The current deployment is a prototype/demo rather than a production enterprise IT service desk.
- LLM functionality is optional; the deterministic grounded fallback allows the hosted demo to operate without an API key.

## Assignment

**Veridian Corp — Assignment 2: Internal Service Agent (IT Support)**  
**Assignment week:** 21–25 September 2026
