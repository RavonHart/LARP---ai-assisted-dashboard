import { db } from '../db/db.js';
import { 
  executionPlans, 
  executionSessions, 
  agentExecutions, 
  agents as agentsTable
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { socketService } from './socket.js';
import { AgentOutput } from '@dashboard/shared';
import crypto from 'crypto';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ExecutionService {
  // Store active session execution controllers to allow cancellation/abort queries
  private activeJobs = new Map<string, boolean>();

  public async startExecution(planId: string): Promise<void> {
    // 1. Fetch plan and validation checks
    const [plan] = await db.select().from(executionPlans).where(eq(executionPlans.id, planId));
    if (!plan) {
      throw new Error(`[ExecutionService] Plan not found: ${planId}`);
    }

    const sessionId = plan.sessionId;
    const task = plan.userTask;
    const sequence: string[] = JSON.parse(plan.agentsSequence || '[]');
    const selectedSkills = JSON.parse(plan.selectedSkills || '{}');

    // Update Plan and Session states to executing
    await db.update(executionPlans).set({ status: 'executing' }).where(eq(executionPlans.id, planId));
    await db.update(executionSessions).set({ status: 'executing' }).where(eq(executionSessions.id, sessionId));

    // Register active execution tracking flag
    this.activeJobs.set(sessionId, true);

    // Run the execution loop in the background asynchronously
    this.runPipeline(sessionId, planId, task, sequence, selectedSkills).catch((err) => {
      console.error(`[ExecutionService] Pipeline crash on session ${sessionId}:`, err);
    });
  }

  private async runPipeline(
    sessionId: string,
    planId: string,
    task: string,
    sequence: string[],
    selectedSkills: { language: string; frameworks: string[]; methodologies: string[] }
  ): Promise<void> {
    console.info(`[ExecutionService] Starting remote Python graph execution for session: ${sessionId}`);
    let totalTokensUsed = 0;
    let totalCost = 0;
    const allAgents = await db.select().from(agentsTable);

    try {
      const response = await fetch('http://localhost:8000/run-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          language: selectedSkills.language,
          frameworks: selectedSkills.frameworks,
        }),
      });

      if (!response.ok) {
        throw new Error(`Python microservice returned error status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body from Python microservice');
      }

      // @ts-ignore
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const agentIdMap: Record<string, string> = {
        architect: 'architect',
        db_designer: 'db-designer',
        developer: 'backend-dev',
        tester: 'tester',
        reviewer: 'code-reviewer',
      };

      while (true) {
        // Check if session job was aborted
        if (!this.activeJobs.get(sessionId)) {
          console.warn(`[ExecutionService] Session ${sessionId} aborted mid-pipeline.`);
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            let event: any;
            try {
              event = JSON.parse(dataStr);
            } catch (err) {
              console.error('Failed to parse SSE JSON chunk:', dataStr, err);
              continue;
            }

            // Broadcast general progress event as requested
            socketService.emitToSession(sessionId, 'progress', event);

            // Handle END/Complete signal
            if (event.event === 'complete') {
              console.info(`[ExecutionService] Python graph execution complete signal received.`);
              continue;
            }

            // Identify node update
            const nodeNames = Object.keys(event);
            if (nodeNames.length === 0) continue;
            const nodeName = nodeNames[0];

            // Map Python node name to DB Agent ID
            const agentId = agentIdMap[nodeName];
            if (!agentId) {
              continue;
            }

            const dbAgent = allAgents.find((a) => a.id === agentId);
            if (!dbAgent) continue;

            const nodeOutput = event[nodeName];

            // 1. Emit agent started
            socketService.emitToSession(sessionId, 'agent_started', {
              agentId,
              name: dbAgent.name,
              emoji: dbAgent.emoji,
              message: `${dbAgent.name} is compiling output...`,
            });

            // Add UX pacing delay so the user sees the transitions
            await delay(1000);

            // 2. Prepare mock artifact outputs and structure
            const executionId = `exec-${crypto.randomUUID().slice(0, 8)}`;
            const artifacts: Record<string, string> = {};
            let reasoning = '';
            let summary = '';
            let status: 'success' | 'failed' | 'needs_revision' = 'success';

            if (nodeName === 'architect') {
              artifacts['architecture_doc.md'] = nodeOutput.architecture_doc || '';
              reasoning = 'Designed system architecture design components and layout.';
              summary = 'Completed architectural design.';
            } else if (nodeName === 'db_designer') {
              artifacts['schema.sql'] = nodeOutput.db_schema || '';
              reasoning = 'Structured relational schemas and tables.';
              summary = 'Completed DB schema creation.';
            } else if (nodeName === 'developer') {
              artifacts['app.py'] = nodeOutput.code || '';
              reasoning = 'Wrote backend services and routing endpoints.';
              summary = 'Completed backend code implementation.';
            } else if (nodeName === 'tester') {
              artifacts['test_results.txt'] = nodeOutput.test_results || '';
              reasoning = 'Configured tests and validated backend behaviors.';
              summary = 'Completed automated test execution.';
            } else if (nodeName === 'reviewer') {
              artifacts['review_feedback.md'] = nodeOutput.review_feedback || '';
              reasoning = 'Reviewed overall codebase compliance and design guidelines.';
              if (nodeOutput.status === 'complete') {
                summary = 'Passed code review with success.';
                status = 'success';
              } else {
                summary = 'Failed code review. Code revision requested.';
                status = 'needs_revision';
              }
            }

            const mockTokens = dbAgent.estimatedTokens || 4000;
            const mockCost = status === 'success' ? 0.015 : 0.01;

            totalTokensUsed += mockTokens;
            totalCost += mockCost;

            const outputData: AgentOutput = {
              id: `out-${crypto.randomUUID().slice(0, 8)}`,
              agent_id: agentId,
              status,
              raw_response: JSON.stringify(nodeOutput),
              parsed_output: {
                reasoning,
                artifacts,
                summary,
              },
            };

            // 3. Save to database
            await db.insert(agentExecutions).values({
              id: executionId,
              planId,
              agentId,
              sequencePosition: sequence.indexOf(agentId) + 1,
              status: 'completed',
              inputContext: JSON.stringify({ task, injectedSkills: [] }),
              outputJson: JSON.stringify(outputData),
              reasoning,
              artifacts: JSON.stringify(artifacts),
              summary,
              tokensInput: Math.round(mockTokens * 0.6),
              tokensOutput: Math.round(mockTokens * 0.4),
              costUsd: mockCost,
              durationSeconds: 1,
              modelUsed: 'claude-3-5-sonnet',
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            });

            // 4. Emit agent completed
            socketService.emitToSession(sessionId, 'agent_completed', {
              agentId,
              name: dbAgent.name,
              output: outputData,
              tokensUsed: mockTokens,
              costUsed: mockCost,
            });
          }
        }
      }

      // Complete session state in DB
      await db
        .update(executionSessions)
        .set({
          status: 'complete',
          completedAt: new Date().toISOString(),
          totalTokensUsed,
          totalCost,
        })
        .where(eq(executionSessions.id, sessionId));

      await db
        .update(executionPlans)
        .set({ status: 'complete' })
        .where(eq(executionPlans.id, planId));

      // Broadcast complete event
      socketService.emitToSession(sessionId, 'execution_complete', {
        summary: 'LangGraph pipeline execution completed successfully.',
        howToRun: 'Run Python packages to view results.',
        architectureSummary: 'Completed architectural layout.',
        knownLimitations: 'Simulated pipeline engine.',
        nextSteps: 'Proceed to code deployments.',
        totalTokens: totalTokensUsed,
        totalCost,
      });

    } catch (error: any) {
      console.error(`[ExecutionService] Python pipeline crash on session ${sessionId}:`, error);

      // Update session and plan states to failed
      await db
        .update(executionSessions)
        .set({ status: 'failed', completedAt: new Date().toISOString() })
        .where(eq(executionSessions.id, sessionId));

      await db
        .update(executionPlans)
        .set({ status: 'failed' })
        .where(eq(executionPlans.id, planId));

      // Broadcast error block
      socketService.emitToSession(sessionId, 'execution_failed', {
        error: error.message || 'Unknown internal pipeline execution error',
      });
    } finally {
      this.activeJobs.delete(sessionId);
    }
  }

  public abortExecution(sessionId: string): void {
    if (this.activeJobs.has(sessionId)) {
      this.activeJobs.set(sessionId, false);
      console.info(`[ExecutionService] Cancellation flag registered for session: ${sessionId}`);
    }
  }
}

export const executionService = new ExecutionService();
