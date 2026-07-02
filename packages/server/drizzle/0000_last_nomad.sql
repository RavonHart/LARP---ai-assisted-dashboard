CREATE TABLE `agent_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`sequence_position` integer,
	`status` text,
	`input_context` text,
	`output_json` text,
	`reasoning` text,
	`artifacts` text,
	`summary` text,
	`tokens_input` integer,
	`tokens_output` integer,
	`cost_usd` real,
	`duration_seconds` integer,
	`model_used` text,
	`error_message` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`completed_at` text,
	FOREIGN KEY (`plan_id`) REFERENCES `execution_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_executions_plan` ON `agent_executions` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_executions_agent` ON `agent_executions` (`agent_id`);--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`emoji` text,
	`system_prompt` text NOT NULL,
	`required_skills` text,
	`optional_skills` text,
	`input_type` text,
	`output_type` text,
	`dependencies` text,
	`estimated_tokens` integer,
	`role` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `execution_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_task` text NOT NULL,
	`selected_skills` text,
	`agents_sequence` text,
	`reasoning` text,
	`dependencies` text,
	`estimated_tokens` integer,
	`estimated_cost` real,
	`status` text DEFAULT 'created',
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`session_id`) REFERENCES `execution_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `execution_selections` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`selected_skill_ids` text,
	`selected_agent_ids` text,
	`selected_language` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`session_id`) REFERENCES `execution_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `execution_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_task` text NOT NULL,
	`selected_language` text,
	`selected_frameworks` text,
	`selected_methodologies` text,
	`plan_id` text,
	`status` text DEFAULT 'planning',
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`completed_at` text,
	`total_tokens_used` integer,
	`total_cost` real
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_created` ON `execution_sessions` (`created_at`);--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`applies_to` text,
	`tags` text,
	`version` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
