import { db } from '../db/db.js';
import { 
  executionPlans, 
  executionSessions, 
  agentExecutions, 
  agents as agentsTable, 
  skills as skillsTable 
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { socketService } from './socket.js';
import { ArtifactGenerator } from './generator.js';
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
    console.info(`[ExecutionService] Starting pipeline loop for session: ${sessionId}`);
    const previousOutputs: AgentOutput[] = [];
    let totalTokensUsed = 0;
    let totalCost = 0;

    try {
      // Load all catalog skills and agents from DB for context injection
      const allSkills = await db.select().from(skillsTable);
      const allAgents = await db.select().from(agentsTable);

      for (let i = 0; i < sequence.length; i++) {
        // Check if session job was aborted
        if (!this.activeJobs.get(sessionId)) {
          console.warn(`[ExecutionService] Session ${sessionId} aborted mid-pipeline.`);
          return;
        }

        const agentId = sequence[i];
        const dbAgent = allAgents.find((a) => a.id === agentId);
        if (!dbAgent) {
          throw new Error(`[ExecutionService] Agent definition not found in catalog: ${agentId}`);
        }

        const executionId = `exec-${crypto.randomUUID().slice(0, 8)}`;
        console.info(`[ExecutionService] Starting agent: ${dbAgent.name} (${i + 1}/${sequence.length})`);

        // Filter and compile injected skills for this agent
        const appliesToAgent = (skill: typeof allSkills[0]) => {
          try {
            const list = JSON.parse(skill.appliesTo || '[]') as string[];
            return list.includes(agentId);
          } catch {
            return false;
          }
        };
        const agentSkills = allSkills
          .filter((s) => appliesToAgent(s))
          .map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category as 'framework' | 'language' | 'methodology',
            description: s.description || '',
            content: s.content,
            applies_to: JSON.parse(s.appliesTo || '[]'),
            tags: JSON.parse(s.tags || '[]'),
            version: s.version || '1.0',
          }));

        // Broadcast: Agent started thinking
        socketService.emitToSession(sessionId, 'agent_started', {
          agentId,
          name: dbAgent.name,
          emoji: dbAgent.emoji,
          message: `${dbAgent.name} is inspecting requirements...`,
        });

        // Insert pending agent execution record into DB
        await db.insert(agentExecutions).values({
          id: executionId,
          planId,
          agentId,
          sequencePosition: i + 1,
          status: 'running',
          inputContext: JSON.stringify({ task, previousOutputs, injectedSkills: agentSkills }),
          createdAt: new Date().toISOString(),
        });

        // Simulate API network latency (e.g. 1.8 seconds)
        await delay(1800);

        // Fail hard simulation context:
        // If task description has failure keywords and agent is backend-dev or tester, trigger failure
        const forceFail = 
          task.toLowerCase().includes('fail') || task.toLowerCase().includes('error');
        if (forceFail && (agentId === 'backend-dev' || agentId === 'tester')) {
          const failMsg = `[Simulated Compiler Error] ${dbAgent.name} failed to resolve module dependencies. Syntax issue detected in build pipelines.`;
          throw new Error(failMsg);
        }

        // Generate mock successful output
        const generated = ArtifactGenerator.generateMockOutput(
          agentId,
          task,
          selectedSkills.language,
          selectedSkills.frameworks
        );

        const durationSeconds = 2; 
        const mockCost = generated.parsed_output.quality_score ? 0.015 : 0.01;
        const mockTokens = (dbAgent.estimatedTokens || 4000);

        totalTokensUsed += mockTokens;
        totalCost += mockCost;

        const outputData: AgentOutput = {
          id: `out-${crypto.randomUUID().slice(0, 8)}`,
          agent_id: agentId,
          status: generated.status as 'success' | 'failed' | 'needs_revision',
          raw_response: generated.raw_response,
          parsed_output: {
            reasoning: generated.parsed_output.reasoning,
            artifacts: generated.parsed_output.artifacts,
            summary: generated.parsed_output.summary,
            quality_score: generated.parsed_output.quality_score,
          },
        };

        // Update database execution record as completed
        await db
          .update(agentExecutions)
          .set({
            status: 'completed',
            outputJson: JSON.stringify(outputData),
            reasoning: outputData.parsed_output.reasoning,
            artifacts: JSON.stringify(outputData.parsed_output.artifacts),
            summary: outputData.parsed_output.summary,
            tokensInput: Math.round(mockTokens * 0.6),
            tokensOutput: Math.round(mockTokens * 0.4),
            costUsd: mockCost,
            durationSeconds,
            modelUsed: 'claude-3-5-sonnet',
            completedAt: new Date().toISOString(),
          })
          .where(eq(agentExecutions.id, executionId));

        previousOutputs.push(outputData);

        // Broadcast: Agent completed run
        socketService.emitToSession(sessionId, 'agent_completed', {
          agentId,
          name: dbAgent.name,
          output: outputData,
          tokensUsed: mockTokens,
          costUsed: mockCost,
        });

        // Small delay between sequential agent chains for UX pacing
        await delay(500);
      }

      // ==========================================
      // Phase 3: Synthesis Generation (Final Step)
      // ==========================================
      socketService.emitToSession(sessionId, 'agent_started', {
        agentId: 'synthesizer',
        name: 'Synthesizer',
        emoji: '📝',
        message: 'Compiling all generated files and creating setup guide...',
      });
      await delay(1200);

      const synthesisText = ArtifactGenerator.generateSynthesis(
        task,
        selectedSkills.language,
        selectedSkills.frameworks
      );
      const parsedSynthesis = JSON.parse(synthesisText);

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
        summary: parsedSynthesis.summary,
        howToRun: parsedSynthesis.how_to_run,
        architectureSummary: parsedSynthesis.architecture_summary,
        knownLimitations: parsedSynthesis.known_limitations,
        nextSteps: parsedSynthesis.next_steps,
        totalTokens: totalTokensUsed,
        totalCost,
      });

    } catch (error: any) {
      console.error(`[ExecutionService] Hard Failure encountered on session ${sessionId}:`, error);

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
