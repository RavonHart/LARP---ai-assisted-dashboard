# 🤖 AI Skills & Agents Dashboard

A premium, modern full-stack developer platform built as a strict TypeScript monorepo. This application showcases a coordinated, sequential pipeline of specialized AI agents (System Architect, Database Designer, Backend Developer, QA Tester, and Code Reviewer) collaborating in real-time to design, build, test, and review complete software systems.

---

## 🌟 Key Features

* **Sequential Agent Orchestration:** Coordinates specialized agent personas in a linear bucket chain.
* **Real-Time WebSocket Monitoring:** Connects to session rooms via Socket.io to stream granular log transitions and progress tickers.
* **Relational Schema Integration (Drizzle ORM & SQLite):** Stores catalog properties (agents/skills) and execution states (sessions, plans, executions) in a robust database layout.
* **Type-Safe Form Configuration:** Integrates **React Hook Form** with **Zod** client-side validators to prevent boundary config mismatches.
* **Plan Approval & Cost Transparency:** Visualizes top-sorted build plans, including reasoning, estimated costs, and token usages per agent step.
* **Deterministic Simulation Engine:** Mimics network latency delays, cost tallies, and hard code-pipeline compiler failures.

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
    │   ├── src/routes.tsx   # TanStack Router screens and layouts
    │   ├── src/index.css    # Tailwind styling and Linear dark mode variable tokens
    │   └── package.json
    └── server/              # Node.js Express Backend
        ├── src/index.ts     # Server bootstrap and websocket binder
        ├── src/routes/      # REST API route handlers
        ├── src/db/          # SQLite client configuration and seed files
        ├── src/services/    # Async runner, planner, and mock generator services
        └── package.json
```

---

## ⚙️ Getting Started & Setup

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** (v10+ standard bundle)
* **pnpm** (If not installed globally, the workspace handles installations via `npx pnpm`)

### 1. Install Dependencies
Initialize package structures and build native SQLite drivers:
```bash
npx pnpm install
```

### 2. Generate and Run Database Migrations
Prepare the SQLite relational layout and apply schema migrations:
```bash
# Generate the migration files
npx pnpm --filter server db:generate

# Apply migrations on SQLite database
npx pnpm --filter server db:migrate
```

### 3. Seed Catalog Data
Populate the SQLite database with default agents (Architect, DB Designer, Developer, Tester, Reviewer) and skills:
```bash
npx pnpm --filter server db:seed
```

### 4. Build and Compile Workspace
Verify that shared type declarations resolve cleanly across packages:
```bash
npx pnpm build
```

### 5. Launch Development Servers
Run the Express backend API (port `3001`) and the Vite React client dev server (port `5173`) concurrently:
```bash
npx pnpm dev
```
Open your browser and navigate to: **`http://localhost:5173`**

---

## 🧪 Simulation Failures Hook

To test the application's **fail-hard** error routing:
1. Go to the configuration form.
2. In the task description textarea, include the keyword `fail` or `error` (e.g., *"Build a service that will fail"*).
3. Generate the plan and approve it.
4. The pipeline will transition status to **Pipeline Failed** during the `backend-dev` or `tester` step, simulating a compile-time exception and displaying detailed stack diagnostics inside the console card.
