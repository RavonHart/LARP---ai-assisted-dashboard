import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ==========================================
// 1. Skills Catalog Table
// ==========================================
export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'framework', 'language', 'methodology'
  description: text('description'),
  content: text('content').notNull(), // Detailed markdown / rules text
  appliesTo: text('applies_to'), // JSON array of agent IDs
  tags: text('tags'), // JSON array of tag strings
  version: text('version'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ==========================================
// 2. Agent Definitions Table
// ==========================================
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  emoji: text('emoji'),
  systemPrompt: text('system_prompt').notNull(),
  requiredSkills: text('required_skills'), // JSON array of skill IDs
  optionalSkills: text('optional_skills'), // JSON array of skill IDs
  inputType: text('input_type'),
  outputType: text('output_type'),
  dependencies: text('dependencies'), // JSON array of agent IDs
  estimatedTokens: integer('estimated_tokens'),
  role: text('role'), // 'architect', 'developer', 'reviewer', 'tester'
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ==========================================
// 3. Execution Sessions Table
// ==========================================
export const executionSessions = sqliteTable('execution_sessions', {
  id: text('id').primaryKey(),
  userTask: text('user_task').notNull(),
  selectedLanguage: text('selected_language'),
  selectedFrameworks: text('selected_frameworks'), // JSON array
  selectedMethodologies: text('selected_methodologies'), // JSON array
  planId: text('plan_id'),
  status: text('status').default('planning'), // 'planning', 'executing', 'complete', 'failed'
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  completedAt: text('completed_at'),
  totalTokensUsed: integer('total_tokens_used'),
  totalCost: real('total_cost'),
}, (table) => [
  index('idx_sessions_created').on(table.createdAt)
]);

// ==========================================
// 4. Execution Plans Table
// ==========================================
export const executionPlans = sqliteTable('execution_plans', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => executionSessions.id, { onDelete: 'cascade' }),
  userTask: text('user_task').notNull(),
  selectedSkills: text('selected_skills'), // JSON representation of SelectedSkills
  agentsSequence: text('agents_sequence'), // JSON array of agent IDs
  reasoning: text('reasoning'),
  dependencies: text('dependencies'), // JSON key-value of agent dependencies
  estimatedTokens: integer('estimated_tokens'),
  estimatedCost: real('estimated_cost'),
  status: text('status').default('created'), // 'created', 'approved', 'executing', 'complete'
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ==========================================
// 5. Agent Executions Table
// ==========================================
export const agentExecutions = sqliteTable('agent_executions', {
  id: text('id').primaryKey(),
  planId: text('plan_id')
    .notNull()
    .references(() => executionPlans.id, { onDelete: 'cascade' }),
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id),
  sequencePosition: integer('sequence_position'),
  status: text('status'), // 'pending', 'running', 'completed', 'failed'
  inputContext: text('input_context'), // Raw context string sent to LLM
  outputJson: text('output_json'), // Raw response output JSON string
  reasoning: text('reasoning'),
  artifacts: text('artifacts'), // JSON { filename: content }
  summary: text('summary'),
  tokensInput: integer('tokens_input'),
  tokensOutput: integer('tokens_output'),
  costUsd: real('cost_usd'),
  durationSeconds: integer('duration_seconds'),
  modelUsed: text('model_used'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  completedAt: text('completed_at'),
}, (table) => [
  index('idx_executions_plan').on(table.planId),
  index('idx_executions_agent').on(table.agentId)
]);

// ==========================================
// 6. User Selection Preserves Table
// ==========================================
export const executionSelections = sqliteTable('execution_selections', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => executionSessions.id, { onDelete: 'cascade' }),
  selectedSkillIds: text('selected_skill_ids'), // JSON array
  selectedAgentIds: text('selected_agent_ids'), // JSON array
  selectedLanguage: text('selected_language'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});
