import { z } from 'zod';

// ==========================================
// 1. Skill Schemas & Interfaces
// ==========================================

export const SkillCategorySchema = z.enum(['framework', 'language', 'methodology']);
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: SkillCategorySchema,
  description: z.string(),
  content: z.string(),
  applies_to: z.array(z.string()),
  tags: z.array(z.string()),
  version: z.string(),
  created_at: z.string().or(z.date()).optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

// ==========================================
// 2. Agent Schemas & Interfaces
// ==========================================

export const AgentRoleSchema = z.enum(['architect', 'developer', 'reviewer', 'tester']);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  emoji: z.string(),
  system_prompt: z.string(),
  required_skills: z.array(z.string()),
  optional_skills: z.array(z.string()),
  input_type: z.string(),
  output_type: z.string(),
  dependencies: z.array(z.string()),
  estimated_tokens: z.number(),
  role: AgentRoleSchema,
});
export type Agent = z.infer<typeof AgentSchema>;

// ==========================================
// 3. Execution Plan Schemas & Interfaces
// ==========================================

export const SelectedSkillsSchema = z.object({
  language: z.string(),
  frameworks: z.array(z.string()),
  methodologies: z.array(z.string()),
});
export type SelectedSkills = z.infer<typeof SelectedSkillsSchema>;

export const EstimatedCostBreakdownSchema = z.object({
  tokens: z.number(),
  cost: z.number(),
});

export const ExecutionPlanStatusSchema = z.enum(['created', 'approved', 'executing', 'complete', 'failed']);
export type ExecutionPlanStatus = z.infer<typeof ExecutionPlanStatusSchema>;

export const ExecutionPlanSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  created_at: z.string().or(z.date()),
  user_task: z.string(),
  selected_skills: SelectedSkillsSchema,
  agents_sequence: z.array(z.string()),
  reasoning: z.string(),
  dependencies: z.record(z.array(z.string())),
  estimated_cost: z.object({
    total_tokens: z.number(),
    estimated_usd: z.number(),
    breakdown: z.record(EstimatedCostBreakdownSchema),
  }),
  status: ExecutionPlanStatusSchema,
});
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

// ==========================================
// 4. Agent Output Schemas & Interfaces
// ==========================================

export const AgentOutputStatusSchema = z.enum(['success', 'failed', 'needs_revision']);
export type AgentOutputStatus = z.infer<typeof AgentOutputStatusSchema>;

export const AgentOutputSchema = z.object({
  id: z.string(),
  agent_id: z.string(),
  status: AgentOutputStatusSchema,
  raw_response: z.string(),
  parsed_output: z.object({
    reasoning: z.string(),
    artifacts: z.record(z.string()), // filename -> content
    summary: z.string(),
    quality_score: z.number().optional(),
  }),
  error: z.string().optional(),
});
export type AgentOutput = z.infer<typeof AgentOutputSchema>;

// ==========================================
// 5. Agent Execution Schemas & Interfaces
// ==========================================

export const AgentExecutionStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export type AgentExecutionStatus = z.infer<typeof AgentExecutionStatusSchema>;

export const AgentExecutionSchema = z.object({
  id: z.string(),
  plan_id: z.string(),
  agent_id: z.string(),
  sequence_position: z.number(),
  status: AgentExecutionStatusSchema,
  input: z.object({
    user_task: z.string(),
    previous_outputs: z.array(AgentOutputSchema),
    injected_skills: z.array(SkillSchema),
    context: z.string(),
  }),
  output: AgentOutputSchema.optional(),
  metadata: z.object({
    started_at: z.string().or(z.date()),
    completed_at: z.string().or(z.date()).optional(),
    duration_seconds: z.number().optional(),
    model_used: z.string(),
    tokens_input: z.number(),
    tokens_output: z.number(),
    tokens_total: z.number(),
    cost_usd: z.number(),
  }).optional(),
});
export type AgentExecution = z.infer<typeof AgentExecutionSchema>;

// ==========================================
// 6. Session Schemas & Interfaces
// ==========================================

export const ExecutionSessionStatusSchema = z.enum(['planning', 'executing', 'complete', 'failed']);
export type ExecutionSessionStatus = z.infer<typeof ExecutionSessionStatusSchema>;

export const ExecutionSessionSchema = z.object({
  id: z.string(),
  user_task: z.string(),
  selected_language: z.string(),
  selected_frameworks: z.array(z.string()),
  selected_methodologies: z.array(z.string()),
  plan_id: z.string().optional(),
  status: ExecutionSessionStatusSchema,
  created_at: z.string().or(z.date()),
  completed_at: z.string().or(z.date()).optional(),
  total_tokens_used: z.number().optional(),
  total_cost: z.number().optional(),
});
export type ExecutionSession = z.infer<typeof ExecutionSessionSchema>;
