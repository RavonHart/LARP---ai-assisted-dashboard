import { db } from '../db/db.js';
import { executionPlans, agents as agentsTable } from '../db/schema.js';
import { ExecutionPlan, SelectedSkills } from '@dashboard/shared';
import crypto from 'crypto';

export class PlanningService {
  public async planExecution(
    sessionId: string,
    task: string,
    selectedSkills: SelectedSkills,
    selectedAgentIds: string[],
  ): Promise<ExecutionPlan> {
    // 1. Fetch available agents from database
    const dbAgents = await db.select().from(agentsTable);

    // Sort selected agents based on topological order requirements:
    // Architect -> DB Designer -> Developer -> Tester -> Reviewer
    const sequenceOrder = ['architect', 'db-designer', 'backend-dev', 'tester', 'code-reviewer'];
    const activeSequence = sequenceOrder.filter((id) => selectedAgentIds.includes(id));
    selectedAgentIds.forEach((id) => {
      if (!activeSequence.includes(id)) activeSequence.push(id);
    });

    // 2. Map dependencies
    const dependencies: Record<string, string[]> = {};
    activeSequence.forEach((agentId) => {
      const dbAgent = dbAgents.find((a) => a.id === agentId);
      if (dbAgent && dbAgent.dependencies) {
        try {
          const rawDeps = JSON.parse(dbAgent.dependencies) as string[];
          dependencies[agentId] = rawDeps.filter((d) => activeSequence.includes(d));
        } catch {
          dependencies[agentId] = [];
        }
      } else {
        dependencies[agentId] = [];
      }
    });

    // 3. Compute cost estimate breakdowns (Sonnet 3.5 assumptions)
    let totalTokens = 0;
    const breakdown: Record<string, { tokens: number; cost: number }> = {};

    activeSequence.forEach((agentId) => {
      const dbAgent = dbAgents.find((a) => a.id === agentId);
      const estTokens = dbAgent?.estimatedTokens || 4000;
      const inputTokens = estTokens;
      const outputTokens = Math.round(estTokens * 0.7);
      // Sonnet 3.5 pricing: $0.003/1K input, $0.015/1K output
      const cost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000;
      const tokens = inputTokens + outputTokens;

      breakdown[agentId] = {
        tokens,
        cost: Number(cost.toFixed(5)),
      };
      totalTokens += tokens;
    });

    const estimatedUsd = Number(
      Object.values(breakdown).reduce((acc, curr) => acc + curr.cost, 0).toFixed(5),
    );

    const planId = `plan-${crypto.randomUUID().slice(0, 8)}`;

    const planData: ExecutionPlan = {
      id: planId,
      session_id: sessionId,
      created_at: new Date().toISOString(),
      user_task: task,
      selected_skills: selectedSkills,
      agents_sequence: activeSequence,
      reasoning: `Coordinating sequential queue: ${activeSequence.join(' ➔ ')}. Architectural layout guides database constraints, which feeds developer models and tests, concluding with review audits.`,
      dependencies,
      estimated_cost: {
        total_tokens: totalTokens,
        estimated_usd: estimatedUsd,
        breakdown,
      },
      status: 'created',
    };

    // Save to the database
    await db.insert(executionPlans).values({
      id: planData.id,
      sessionId: planData.session_id,
      userTask: planData.user_task,
      selectedSkills: JSON.stringify(planData.selected_skills),
      agentsSequence: JSON.stringify(planData.agents_sequence),
      reasoning: planData.reasoning,
      dependencies: JSON.stringify(planData.dependencies),
      estimatedTokens: planData.estimated_cost.total_tokens,
      estimatedCost: planData.estimated_cost.estimated_usd,
      status: planData.status,
    });

    return planData;
  }
}

export const planningService = new PlanningService();
