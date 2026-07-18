# 🤖 AI Skills & Agents Dashboard

A premium, modern full-stack developer platform built as a strict monorepo. This application showcases a coordinated, sequential pipeline of specialized AI agents (System Architect, Database Designer, Backend Developer, QA Tester, and Code Reviewer) collaborating in real-time using LangGraph to design, build, test, and review complete software systems.

---

## 🌟 Key Features

* **Sequential Agent Orchestration (LangGraph):** Coordinates specialized agent personas in a state graph flow with self-correcting feedback loops.
* **OpenAI Integration:** Utilizes `gpt-4o-mini` with custom system instructions to generate real system components, database schemas, codebases, tests, and reviews.
* **Real-time SSE & WebSockets Stream:** Fetches streaming updates chunk-by-chunk from the LangGraph service using Server-Sent Events (SSE), and broadcasts progress tickers to the React front-end via Socket.io.
* **ZIP Codebase Export:** Aggregates and zips all generated codebase files (`schema.sql`, `app.py`, `architecture_doc.md`, etc.) for direct browser download.
* **Relational Schema Integration (Drizzle ORM & SQLite):** Stores catalog properties (agents/skills) and execution states (sessions, plans, executions) in a robust database layout.
* **Type-Safe Form Configuration:** Integrates **React Hook Form** with **Zod** client-side validators.
* **Plan Approval & Cost Transparency:** Visualizes build plans, reasoning, estimated costs, and token usages per agent step.

---

## 📂 Project Structure

This project is organized as a unified workspace using `pnpm`:

```text
/ (Monorepo Root)
├── package.json             # Root workspace scripts and task execution
├── pnpm-workspace.yaml      # Monorepo packages boundaries definition
├── tsconfig.base.json       # Strict TypeScript base configuration
├── eslint.config.js         # ESLint Flat configurations
├── .prettierrc              # Prettier format rules
└── packages/
    ├── shared/              # Shared data contracts and Zod schemas
    │   ├── src/index.ts     # Core types (Agent, Skill, ExecutionPlan, etc.)
    │   └── package.json
    ├── client/              # React 19 Frontend (Vite)
    │   ├── src/main.tsx     # App entrypoint hook for routing and caching
    │   ├── src/routes.tsx   # TanStack Router screens, layouts, and zip exporter
    │   ├── src/index.css    # Custom CSS styling tokens
    │   └── package.json
    ├── server/              # Node.js Express Backend & API Gateway
    │   ├── src/index.ts     # Server bootstrap and websocket binder
    │   ├── src/routes/      # REST API routes and ZIP export controller
    │   ├── src/db/          # SQLite client configuration and seed files
    │   ├── src/services/    # Execution streaming service using native fetch
    │   └── package.json
    └── ai-engine/           # Python LangGraph Microservice
        ├── requirements.txt # Python package declarations (FastAPI, LangGraph, OpenAI)
        ├── state.py         # GraphState TypedDict definition
        ├── graph.py         # Node functions and retry edge routing rules
        └── main.py          # FastAPI application streaming SSE endpoint
```

---

## ⚙️ Getting Started & Setup

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **Python** (v3.9 or higher recommended)
* **pnpm** (Managed via workspace commands or `npx pnpm`)

### 1. Install Node.js Dependencies
Initialize monorepo package structures and build SQLite drivers:
```bash
npx pnpm install
```

### 2. Setup Python Virtual Environment & Dependencies
Initialize Python dependencies for the LangGraph microservice:
```bash
# Navigate to microservice
cd packages/ai-engine

# Create virtual environment
python -m venv .venv

# Activate virtual env (Windows)
.venv\Scripts\activate

# Activate virtual env (Mac/Linux)
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Environment Variables Setup
Create a `.env` file inside `packages/ai-engine/` and set your OpenAI API Key:
```env
OPENAI_API_KEY=your-openai-api-key-here
```

### 4. Database Schema Setup & Seed
Prepare the SQLite relational layout and apply migrations/seeds:
```bash
# Generate migrations
npx pnpm --filter server db:generate

# Apply migrations
npx pnpm --filter server db:migrate

# Seed agents & skills
npx pnpm --filter server db:seed
```

### 5. Launch Workspace Dev Servers

#### Run the Node/React workspace:
From the monorepo root:
```bash
npx pnpm dev
```
Express runs on port `3001` and Vite runs on port `5173`.

#### Run the Python LangGraph Engine:
From the `packages/ai-engine/` directory:
```bash
python main.py
```
FastAPI runs on port `8000`.

Open your browser and navigate to: **`http://localhost:5173`**

---

## 🧪 Cyclical Self-Healing Demo
1. Run a pipeline from the "New Build" screen.
2. The agent orchestration executes sequentially: Architect ➡️ DB Designer ➡️ Developer ➡️ Tester.
3. The Reviewer agent receives the developer's output. To demonstrate self-healing, the Reviewer fails the first pass and registers revision feedback.
4. The conditional edge detects the fail status and routes flow back to the Developer node, supplying the reviewer feedback.
5. The Developer rewrites the codebase, passes QA testing, and succeeds on the second Code Review, concluding the graph run.
6. Click **"Download Source (.zip)"** in the completed box to export the finalized code files.
