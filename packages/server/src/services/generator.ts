import { AgentOutput } from '@dashboard/shared';

export class ArtifactGenerator {
  public static generateMockOutput(
    agentId: string,
    task: string,
    language: string = 'python',
    frameworks: string[] = [],
  ): Omit<AgentOutput, 'id' | 'agent_id'> {
    const langLower = language.toLowerCase();
    const isPython = langLower === 'python' || langLower.includes('py');
    const isNode = langLower === 'javascript' || langLower === 'typescript' || langLower.includes('node');

    switch (agentId) {
      case 'architect':
        return {
          status: 'success',
          raw_response: 'Simulated Architect Response',
          parsed_output: {
            reasoning: `I have designed a modular, service-based architecture for the task: "${task}". 
Using ${language} with frameworks: ${frameworks.join(', ') || 'default'}.
Separation of concerns is maintained by dividing the layout into:
1. Entrypoint/Routing Layer
2. Business Logic Service Layer
3. Relational Database Interface Layer`,
            artifacts: {
              'architecture_design.md': `# High-Level System Architecture

## Target Task: ${task}
- **Language Stack:** ${language}
- **Target Frameworks:** ${frameworks.join(', ') || 'None Selected'}

## System Topology
\`\`\`
┌──────────────────┐
│    Web Client    │
└────────┬─────────┘
         │ (HTTP / WebSocket)
         ▼
┌──────────────────┐
│   Routing / API  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Service Layer   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐      ┌──────────────┐
│  Database Layer  │ ───> │ sqlite.db    │
└──────────────────┘      └──────────────┘
\`\`\`

## Component List
1. **API Router:** Manages HTTP routes and WebSockets handshakes.
2. **Business Services:** Runs domain validation logic and handles data structures.
3. **Database Client:** Interfaces with the repository engine using transactional queries.
`,
            },
            summary: `Designed a high-level modular system architecture mapping clients, routes, and database schemas.`,
            quality_score: 95,
          },
        };

      case 'db-designer':
        return {
          status: 'success',
          raw_response: 'Simulated DB Designer Response',
          parsed_output: {
            reasoning: `Based on the architecture, I designed a 3NF normalized relational schema.
Indexes are configured on all foreign key references and high-lookup query filters to prevent full-table scans.`,
            artifacts: {
              'schema.sql': `-- Normalized Database Schema for: ${task}

-- 1. Users table (for session mapping)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Resources table
CREATE TABLE resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Indexes for performance optimizing join lookups
CREATE INDEX idx_resources_user_id ON resources (user_id);
CREATE UNIQUE INDEX idx_users_email ON users (email);
`,
              'queries.sql': `-- Sample Query: Fetch resources with user mapping
SELECT r.id, r.title, r.status, u.email
FROM resources r
JOIN users u ON r.user_id = u.id
WHERE u.email = 'test@example.com';
`,
            },
            summary: `Normalized 3NF relational schema created with primary keys, cascading deletes, and performance indexes.`,
            quality_score: 92,
          },
        };

      case 'backend-dev': {
        const fileExt = isPython ? 'py' : isNode ? 'ts' : 'txt';
        const codeSample = isPython 
          ? `from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="${task} API")

class ResourceSchema(BaseModel):
    title: str
    description: Optional[str] = None

@app.post("/resources", status_code=status.HTTP_201_CREATED)
async def create_resource(data: ResourceSchema):
    # Simulated validation and database persist
    if not data.title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    return {"status": "success", "data": {"id": 1, "title": data.title}}

@app.get("/health")
def health():
    return {"status": "healthy"}
`
          : `import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

interface Resource {
  title: string;
  description?: string;
}

app.post('/resources', (req: Request, res: Response) => {
  const { title } = req.body as Resource;
  if (!title) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }
  return res.status(201).json({ status: 'success', data: { id: 1, title } });
});

app.listen(3000, () => console.log('${task} server active on port 3000'));
`;

        return {
          status: 'success',
          raw_response: 'Simulated Developer Response',
          parsed_output: {
            reasoning: `I wrote clean, type-safe API server code matching the schema constraints.
Dependency structures are decoupled. Included error handling middlewares to prevent backend stack leaks.`,
            artifacts: {
              [`main.${fileExt}`]: codeSample,
              'requirements.txt': isPython ? "fastapi==0.104.0\nuvicorn==0.22.0\npydantic==2.5.0\n" : "express\ncors\n",
              'README.md': `# Setup & Execution Guide

## Setup
1. Install dependencies:
   \`\`\`bash
   ${isPython ? 'pip install -r requirements.txt' : 'npm install'}
   \`\`\`

## Run Dev Server
\`\`\`bash
${isPython ? 'uvicorn main:app --reload' : 'npm run dev'}
\`\`\`
`,
            },
            summary: `Generated complete backend source code with robust input validations, schemas, and README setup guides.`,
            quality_score: 90,
          },
        };
      }

      case 'tester': {
        const testFileExt = isPython ? 'py' : isNode ? 'ts' : 'txt';
        const testSample = isPython
          ? `import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_resource_success():
    response = client.post("/resources", json={"title": "Test Title", "description": "Docs"})
    assert response.status_code == 201
    assert response.json()["status"] == "success"

def test_create_resource_validation_failure():
    response = client.post("/resources", json={"description": "No Title"})
    assert response.status_code == 400
`
          : `import request from 'supertest';
// Assuming app is exported from main
import { app } from './main';

describe('POST /resources', () => {
  it('should return 201 on success', async () => {
    const res = await request(app)
      .post('/resources')
      .send({ title: 'Test Title' });
    expect(res.status).toBe(201);
  });
});
`;

        return {
          status: 'success',
          raw_response: 'Simulated Tester Response',
          parsed_output: {
            reasoning: `Created isolated unit test suites using AAA patterns (Arrange, Act, Assert).
Mock clients simulate HTTP requests to assert response status codes and body JSON payloads.`,
            artifacts: {
              [`test_suite.${testFileExt}`]: testSample,
            },
            summary: `Created test coverage suites validating both success endpoints and error response validations.`,
            quality_score: 94,
          },
        };
      }

      case 'code-reviewer':
        return {
          status: 'success',
          raw_response: 'Simulated Reviewer Response',
          parsed_output: {
            reasoning: `I ran an static analysis audit over the codebase.
The code is modular and clean, adhering to standard security guidelines.`,
            artifacts: {
              'review_feedback.md': `# Code Quality & Security Audit Report

## Audit Summary
- **Overall Code Quality Score:** 91/100
- **Test Coverage:** ~85%
- **Security Constraints:** Checked (No sql-injections found, input schema validated).

## Key Recommendations
1. **Rate Limiting:** Implement token bucket throttlers on \`/resources\` endpoint to prevent brute-force attacks.
2. **Environment Variables:** Avoid hardcoding database paths or credentials. Load variables via environment.
`,
            },
            summary: `Completed code review audit. Highlighted optimization points and verified security checks.`,
            quality_score: 96,
          },
        };

      default:
        throw new Error(`[ArtifactGenerator] Unknown agent ID: ${agentId}`);
    }
  }

  public static generateSynthesis(
    task: string,
    language: string,
    _frameworks: string[],
  ): string {
    return JSON.stringify({
      title: `Synthesis Build Report: ${task}`,
      summary: `Completed full sequential orchestration building a backend service for "${task}" in ${language}.`,
      how_to_run: `1. Configure local variables.\n2. Run install scripts.\n3. Execute server launcher commands.`,
      architecture_summary: `Service-oriented design separated into routers, model validations, and indexed database layers.`,
      known_limitations: [
        'No rate-limiting throttler enabled yet.',
        'Requires SSL certificates setup for production deployments.',
      ],
      next_steps: [
        'Integrate JSON Web Token (JWT) authorization middleware.',
        'Hook system tests into GitHub Action pipelines.',
      ],
      estimated_time_to_production: '1-2 days',
    });
  }
}
