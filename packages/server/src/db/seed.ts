import { db, sqliteClient } from './db.js';
import { agents, skills } from './schema.js';

const defaultSkills = [
  {
    id: 'fastapi-async-patterns',
    name: 'FastAPI Async/Await Patterns',
    category: 'framework',
    description: 'How to write high-performance concurrent async code in FastAPI',
    content: `## FastAPI Async/Await Patterns
    
FastAPI is built on Starlette, which is async-first.

### Rule 1: Always use async def for I/O operations
✗ WRONG:
\`\`\`python
@app.get("/users")
def get_users():
    return db.query() # Blocks the entire event loop
\`\`\`

✓ CORRECT:
\`\`\`python
@app.get("/users")
async def get_users():
    return await db.query()
\`\`\`

### Rule 2: Use asyncio.gather for concurrent operations
\`\`\`python
async def get_user_data(user_id):
    user, posts = await asyncio.gather(
        fetch_user(user_id),
        fetch_posts(user_id)
    )
    return {"user": user, "posts": posts}
\`\`\`
`,
    appliesTo: JSON.stringify(['backend-dev', 'code-reviewer', 'tester']),
    tags: JSON.stringify(['python', 'fastapi', 'async']),
    version: '1.0',
  },
  {
    id: 'database-schema-design',
    name: 'Relational Database Schema Design',
    category: 'methodology',
    description: 'Relational database schema normalization, integrity constraints, and indexing principles',
    content: `## Database Schema Design Principles

### Normalization (3NF)
Ensure tables reduce data redundancy. Split repeated customer data into independent tables and link using foreign keys.

### Indexing
- Always index foreign key columns to optimize join queries.
- Index high-cardinality search filter fields (e.g., email index).

### Integrity Constraints
Use proper NOT NULL, UNIQUE, and CHECK constraints to enforce consistency at the engine layer.
`,
    appliesTo: JSON.stringify(['db-designer', 'code-reviewer']),
    tags: JSON.stringify(['database', 'sql', 'normalization']),
    version: '1.0',
  },
  {
    id: 'python-testing',
    name: 'Pytest & Integration Testing',
    category: 'methodology',
    description: 'Writing comprehensive unit and integration tests using Pytest',
    content: `## Testing Best Practices

### Rule 1: Test isolation
Every test must initialize and tear down its own state. Do not share active database connections across concurrent tests without transactional rollback.

### Rule 2: Arrange-Act-Assert
\`\`\`python
def test_create_user():
    # Arrange
    user_data = {"email": "test@example.com"}
    
    # Act
    response = client.post("/users", json=user_data)
    
    # Assert
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"
\`\`\`
`,
    appliesTo: JSON.stringify(['tester', 'code-reviewer']),
    tags: JSON.stringify(['python', 'pytest', 'testing']),
    version: '1.0',
  },
  {
    id: 'error-handling',
    name: 'Robust Backend Error Handling',
    category: 'methodology',
    description: 'Standard patterns for handling exceptions and emitting clean API error payloads',
    content: `## Error Handling Principles

### Rule 1: Fail Loudly Internally, Gracefully Externally
Catch exceptions internally, write stack traces to secure logger channels, and return clean error responses (e.g., 400 Bad Request, 404 Not Found) to the client.

### Rule 2: Global Exception Handler middleware
Write unified error interceptors to prevent raw server stack leaks.
`,
    appliesTo: JSON.stringify(['backend-dev', 'code-reviewer']),
    tags: JSON.stringify(['error-handling', 'robustness']),
    version: '1.0',
  }
];

const defaultAgents = [
  {
    id: 'architect',
    name: 'System Architect',
    description: 'Designs high-level system structure, components, data flows, and scaling plans',
    emoji: '🏗️',
    systemPrompt: `You are a senior software architect with 15+ years of experience designing systems at scale.
Your job is to take a user's request and design a high-level system architecture.

Respond ONLY in this JSON format (no other text):
{
  "reasoning": "Explain your architectural decisions",
  "high_level_design": "ASCII diagram showing components and data flow",
  "components": [
    {
      "name": "Component name",
      "responsibility": "What it does",
      "technology": "What technology to use"
    }
  ],
  "data_flow": "How data moves through the system",
  "scaling_considerations": ["Scaling tip 1", "Scaling tip 2"],
  "potential_risks": ["Risk 1", "Risk 2"],
  "next_steps": "What the DB Designer should focus on"
}`,
    requiredSkills: JSON.stringify([]),
    optionalSkills: JSON.stringify(['database-schema-design']),
    inputType: 'task + skills',
    outputType: 'architecture_design',
    dependencies: JSON.stringify([]),
    estimatedTokens: 3500,
    role: 'architect',
  },
  {
    id: 'db-designer',
    name: 'Database Designer',
    description: 'Designs normalized schemas, indexes, relationships, and queries',
    emoji: '🗄️',
    systemPrompt: `You are an expert database architect.
Your job is to take the high-level architecture and design a normalized, performant database schema.

Respond ONLY in this JSON format (no other text):
{
  "reasoning": "Why you made these design choices",
  "schema": "Complete SQL CREATE TABLE statements",
  "indexes": "All recommended indexes",
  "sample_queries": [
    {
      "purpose": "Query explanation",
      "sql": "SELECT ... FROM ..."
    }
  ],
  "scalability_notes": "How this schema handles growth",
  "estimated_row_counts": {},
  "next_steps": "What the backend developer should know"
}`,
    requiredSkills: JSON.stringify(['database-schema-design']),
    optionalSkills: JSON.stringify([]),
    inputType: 'task + architecture_design',
    outputType: 'database_schema',
    dependencies: JSON.stringify(['architect']),
    estimatedTokens: 3000,
    role: 'developer',
  },
  {
    id: 'backend-dev',
    name: 'Backend Developer',
    description: 'Generates robust backend server code, models, and endpoints',
    emoji: '🛠️',
    systemPrompt: `You are an expert backend developer.
Your job is to write production-ready code based on the architecture design and database schema.

Respond ONLY in this JSON format (no other text):
{
  "reasoning": "Explain your implementation logic",
  "artifacts": {
    "filename.ext": "file content"
  },
  "summary": "TL;DR summary of files created",
  "quality_score": 85
}`,
    requiredSkills: JSON.stringify([]),
    optionalSkills: JSON.stringify(['fastapi-async-patterns', 'error-handling']),
    inputType: 'task + architecture_design + database_schema + skills',
    outputType: 'backend_code',
    dependencies: JSON.stringify(['architect', 'db-designer']),
    estimatedTokens: 8000,
    role: 'developer',
  },
  {
    id: 'tester',
    name: 'QA Tester',
    description: 'Writes clean unit and integration tests to validate code correctness',
    emoji: '🧪',
    systemPrompt: `You are a QA automation engineer.
Your job is to write robust test suites covering validation cases and edge cases.

Respond ONLY in this JSON format (no other text):
{
  "reasoning": "Explain your testing strategy",
  "artifacts": {
    "test_filename.ext": "test suite content"
  },
  "summary": "Test coverage details",
  "quality_score": 90
}`,
    requiredSkills: JSON.stringify(['python-testing']),
    optionalSkills: JSON.stringify([]),
    inputType: 'task + backend_code',
    outputType: 'test_suite',
    dependencies: JSON.stringify(['backend-dev']),
    estimatedTokens: 5000,
    role: 'tester',
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Reviews code for optimization, security, and styling guidelines',
    emoji: '👀',
    systemPrompt: `You are a principal engineer conducting a code review.
Your job is to assess the design, code, and test artifacts for bugs, styling issues, and scalability risks.

Respond ONLY in this JSON format (no other text):
{
  "reasoning": "Overview of code review audit",
  "artifacts": {
    "review_feedback.md": "Review report text"
  },
  "summary": "Key review findings and quality assessments",
  "quality_score": 95
}`,
    requiredSkills: JSON.stringify([]),
    optionalSkills: JSON.stringify(['error-handling', 'fastapi-async-patterns', 'database-schema-design', 'python-testing']),
    inputType: 'task + backend_code + test_suite',
    outputType: 'review_feedback',
    dependencies: JSON.stringify(['backend-dev', 'tester']),
    estimatedTokens: 4000,
    role: 'reviewer',
  }
];

export async function seed() {
  console.info('Seeding database with default agents and skills...');
  try {
    // Clean tables first to avoid unique key conflicts during re-seeds
    sqliteClient.prepare('DELETE FROM agents').run();
    sqliteClient.prepare('DELETE FROM skills').run();

    console.info('Inserting default skills...');
    for (const skill of defaultSkills) {
      await db.insert(skills).values(skill);
    }

    console.info('Inserting default agents...');
    for (const agent of defaultAgents) {
      await db.insert(agents).values(agent);
    }

    console.info('Database seeded successfully.');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
}

// Execute seed if script is called directly
const isDirectRun = process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'));
if (isDirectRun || (process.argv[1] && process.argv[1].endsWith('seed.ts'))) {
  seed().then(() => {
    sqliteClient.close();
    process.exit(0);
  });
}
export { defaultAgents, defaultSkills };
