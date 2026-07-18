import { Router } from 'express';
import { db } from '../db/db.js';
import { 
  agents as agentsTable, 
  skills as skillsTable, 
  executionSessions, 
  executionPlans, 
  agentExecutions 
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { planningService } from '../services/planning.js';
import { executionService } from '../services/execution.js';
import { z } from 'zod';
import crypto from 'crypto';
import archiver from 'archiver';

const router: Router = Router();

// ==========================================
// 1. GET /api/agents - List all agents
// ==========================================
router.get('/agents', async (_req, res) => {
  try {
    const catalogAgents = await db.select().from(agentsTable);
    const parsedAgents = catalogAgents.map((agent) => ({
      ...agent,
      required_skills: JSON.parse(agent.requiredSkills || '[]'),
      optional_skills: JSON.parse(agent.optionalSkills || '[]'),
      dependencies: JSON.parse(agent.dependencies || '[]'),
    }));
    res.json({ agents: parsedAgents });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve agents.' });
  }
});

// ==========================================
// 2. GET /api/skills - List all skills
// ==========================================
router.get('/skills', async (req, res) => {
  try {
    const categoryFilter = req.query.category as string | undefined;
    
    let query = db.select().from(skillsTable);
    if (categoryFilter) {
      // @ts-ignore
      query = query.where(eq(skillsTable.category, categoryFilter));
    }
    
    const catalogSkills = await query;
    const parsedSkills = catalogSkills.map((skill) => ({
      ...skill,
      applies_to: JSON.parse(skill.appliesTo || '[]'),
      tags: JSON.parse(skill.tags || '[]'),
    }));
    res.json({ skills: parsedSkills });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve skills.' });
  }
});

// ==========================================
// 3. POST /api/planning - Create execution plan
// ==========================================
const PlanningSchema = z.object({
  task: z.string().min(1, 'Task description is required'),
  selectedSkills: z.object({
    language: z.string(),
    frameworks: z.array(z.string()),
    methodologies: z.array(z.string()),
  }),
  selectedAgents: z.array(z.string()).min(1, 'At least one agent must be selected'),
});

router.post('/planning', async (req, res) => {
  try {
    const body = PlanningSchema.parse(req.body);
    const sessionId = `sess-${crypto.randomUUID().slice(0, 8)}`;

    // Create session record in DB
    await db.insert(executionSessions).values({
      id: sessionId,
      userTask: body.task,
      selectedLanguage: body.selectedSkills.language,
      selectedFrameworks: JSON.stringify(body.selectedSkills.frameworks),
      selectedMethodologies: JSON.stringify(body.selectedSkills.methodologies),
      status: 'planning',
      createdAt: new Date().toISOString(),
    });

    // Run coordinator planner logic
    const plan = await planningService.planExecution(
      sessionId,
      body.task,
      body.selectedSkills,
      body.selectedAgents
    );

    // Update session record with planId link
    await db
      .update(executionSessions)
      .set({ planId: plan.id })
      .where(eq(executionSessions.id, sessionId));

    res.status(201).json({ plan });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ error: error.message || 'Failed to generate plan.' });
    }
  }
});

// ==========================================
// 4. POST /api/execution/approve - User approves plan, start run
// ==========================================
const ApproveSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

router.post('/execution/approve', async (req, res) => {
  try {
    const { planId } = ApproveSchema.parse(req.body);

    // Fetch the execution plan details
    const [plan] = await db.select().from(executionPlans).where(eq(executionPlans.id, planId));
    if (!plan) {
      res.status(404).json({ error: 'Plan not found.' });
      return;
    }

    // Trigger async execution runner in backend service
    await executionService.startExecution(planId);

    res.json({
      sessionId: plan.sessionId,
      message: 'Plan approved. Sequential agent execution queue has started.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ error: error.message || 'Failed to approve plan.' });
    }
  }
});

// ==========================================
// 5. GET /api/execution/:sessionId - Fetch current session execution status
// ==========================================
router.get('/execution/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [session] = await db
      .select()
      .from(executionSessions)
      .where(eq(executionSessions.id, sessionId));

    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    // Fetch executions associated with this session's plan
    let executionsList: any[] = [];
    if (session.planId) {
      const dbExecutions = await db
        .select()
        .from(agentExecutions)
        .where(eq(agentExecutions.planId, session.planId));
      
      executionsList = dbExecutions.map((exec) => ({
        ...exec,
        artifacts: JSON.parse(exec.artifacts || '{}'),
        output: exec.outputJson ? JSON.parse(exec.outputJson) : undefined,
      }));
    }

    res.json({
      status: session.status,
      planId: session.planId,
      totalTokensUsed: session.totalTokensUsed,
      totalCost: session.totalCost,
      executedAgents: executionsList,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load execution status.' });
  }
});

// ==========================================
// 6. GET /api/result/:sessionId - Exposes aggregated execution outputs
// ==========================================
router.get('/result/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [session] = await db
      .select()
      .from(executionSessions)
      .where(eq(executionSessions.id, sessionId));
    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    if (!session.planId) {
      res.status(400).json({ error: 'Session has no plan associated.' });
      return;
    }

    const [plan] = await db
      .select()
      .from(executionPlans)
      .where(eq(executionPlans.id, session.planId));

    const dbExecutions = await db
      .select()
      .from(agentExecutions)
      .where(eq(agentExecutions.planId, session.planId));

    const parsedExecutions = dbExecutions.map((exec) => ({
      ...exec,
      artifacts: JSON.parse(exec.artifacts || '{}'),
      output: exec.outputJson ? JSON.parse(exec.outputJson) : undefined,
    }));

    // Aggregate generated files from all agents into a unified object
    const aggregatedArtifacts: Record<string, string> = {};
    parsedExecutions.forEach((exec) => {
      if (exec.artifacts) {
        Object.entries(exec.artifacts).forEach(([filename, content]) => {
          aggregatedArtifacts[filename] = content as string;
        });
      }
    });

    res.json({
      session: {
        id: session.id,
        userTask: session.userTask,
        status: session.status,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
      },
      plan: {
        id: plan.id,
        reasoning: plan.reasoning,
        estimatedCost: plan.estimatedCost,
        estimatedTokens: plan.estimatedTokens,
        sequence: JSON.parse(plan.agentsSequence || '[]'),
      },
      executions: parsedExecutions,
      artifacts: aggregatedArtifacts,
      totalCost: session.totalCost || 0,
      totalTokens: session.totalTokensUsed || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to aggregate build results.' });
  }
});

// ==========================================
// 7. GET /api/execution/:sessionId/download - Download artifacts as zip
// ==========================================
router.get('/execution/:sessionId/download', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [session] = await db
      .select()
      .from(executionSessions)
      .where(eq(executionSessions.id, sessionId));

    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    if (!session.planId) {
      res.status(400).json({ error: 'Session has no plan associated.' });
      return;
    }

    const dbExecutions = await db
      .select()
      .from(agentExecutions)
      .where(eq(agentExecutions.planId, session.planId));

    // Initialize compression archiver
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="ai-build-${sessionId}.zip"`);

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('[Archiver Warning]:', err);
      } else {
        throw err;
      }
    });

    archive.on('error', (err) => {
      console.error('[Archiver Error]:', err);
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // Append each agent execution artifact to package
    for (const exec of dbExecutions) {
      if (exec.artifacts) {
        try {
          const artifacts = JSON.parse(exec.artifacts);
          for (const [filename, content] of Object.entries(artifacts)) {
            if (typeof content === 'string') {
              archive.append(content, { name: filename });
            }
          }
        } catch (jsonErr) {
          console.error('[Archiver] Failed to parse artifacts:', exec.id, jsonErr);
        }
      }
    }

    await archive.finalize();
  } catch (error: any) {
    console.error('[Download Error]:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to compile zip file download.' });
    }
  }
});

export default router;
