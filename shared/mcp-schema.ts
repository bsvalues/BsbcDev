import { z } from 'zod';
import { pgTable, text, integer, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

// MCP Content Block Schema
export const contentBlockSchema = z.object({
  type: z.enum(['text', 'image', 'audio', 'video', 'file', 'code', 'function_call', 'function_response']),
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  annotations: z.array(z.object({
    type: z.string(),
    value: z.any(),
    range: z.tuple([z.number(), z.number()]).optional()
  })).optional(),
  references: z.array(z.object({
    id: z.string(),
    type: z.string(),
    source: z.string().optional()
  })).optional()
});

// MCP Content Schema
export const mcpContentSchema = z.object({
  metadata: z.object({
    id: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    version: z.string().optional(),
    creator: z.string().optional(),
    context: z.record(z.string(), z.any()).optional()
  }),
  blocks: z.array(contentBlockSchema),
  relationships: z.array(z.object({
    sourceBlockIndex: z.number(),
    targetBlockIndex: z.number(),
    type: z.string()
  })).optional()
});

// MCP Function Schema
export const mcpFunctionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.string(), z.object({
    type: z.string(),
    description: z.string(),
    required: z.boolean().default(false),
    schema: z.any().optional()
  })),
  returnType: z.object({
    type: z.string(),
    description: z.string(),
    schema: z.any().optional()
  }),
  examples: z.array(z.object({
    input: z.record(z.string(), z.any()),
    output: z.any()
  })).optional(),
  permissions: z.array(z.string()).optional(),
  timeout: z.number().optional(),
  idempotent: z.boolean().optional().default(false)
});

// MCP Function Call Schema
export const mcpFunctionCallSchema = z.object({
  functionName: z.string(),
  parameters: z.record(z.string(), z.any()),
  callId: z.string().optional(),
  timestamp: z.string().datetime().optional()
});

// MCP Function Response Schema
export const mcpFunctionResponseSchema = z.object({
  callId: z.string().optional(),
  status: z.enum(['success', 'error', 'partial']),
  result: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().datetime().optional()
});

// MCP Workflow Step Schema
export const mcpWorkflowStepSchema = z.object({
  id: z.string(),
  functionCall: mcpFunctionCallSchema,
  condition: z.string().optional(),
  next: z.union([z.string(), z.array(z.string())]).optional(),
  retry: z.object({
    maxAttempts: z.number(),
    backoff: z.enum(['fixed', 'exponential']).optional(),
    interval: z.number().optional()
  }).optional()
});

// MCP Workflow Schema
export const mcpWorkflowSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputs: z.record(z.string(), z.object({
    type: z.string(),
    description: z.string().optional(),
    required: z.boolean().default(false)
  })).optional(),
  outputs: z.record(z.string(), z.object({
    type: z.string(),
    description: z.string().optional()
  })).optional(),
  steps: z.record(z.string(), mcpWorkflowStepSchema),
  parallel: z.array(z.object({
    steps: z.array(z.string()),
    maxConcurrency: z.number().optional()
  })).optional(),
  timeout: z.number().optional(),
  errorHandlers: z.record(z.string(), z.object({
    action: z.enum(['retry', 'compensate', 'terminate', 'next']),
    target: z.string().optional(),
    maxAttempts: z.number().optional()
  })).optional()
});

// MCP Function Registration Database Tables
export const mcpFunctions = pgTable('mcp_functions', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  parameters: jsonb('parameters').notNull(),
  returnType: jsonb('return_type').notNull(),
  examples: jsonb('examples'),
  permissions: jsonb('permissions'),
  timeout: integer('timeout'),
  idempotent: boolean('idempotent').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  version: text('version').notNull().default('1.0.0'),
  enabled: boolean('enabled').default(true)
});

export const mcpWorkflows = pgTable('mcp_workflows', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  inputs: jsonb('inputs'),
  outputs: jsonb('outputs'),
  steps: jsonb('steps').notNull(),
  parallel: jsonb('parallel'),
  timeout: integer('timeout'),
  errorHandlers: jsonb('error_handlers'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  version: text('version').notNull().default('1.0.0'),
  enabled: boolean('enabled').default(true)
});

export const mcpExecutions = pgTable('mcp_executions', {
  id: integer('id').primaryKey(),
  workflowId: integer('workflow_id').notNull(),
  status: text('status').notNull().default('pending'),
  input: jsonb('input'),
  output: jsonb('output'),
  error: jsonb('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  currentStep: text('current_step')
});

// Insert schemas
export const insertMcpFunctionSchema = createInsertSchema(mcpFunctions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMcpWorkflowSchema = createInsertSchema(mcpWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMcpExecutionSchema = createInsertSchema(mcpExecutions).omit({ id: true, startedAt: true, completedAt: true });

// Types
export type InsertMcpFunction = z.infer<typeof insertMcpFunctionSchema>;
export type McpFunction = typeof mcpFunctions.$inferSelect;

export type InsertMcpWorkflow = z.infer<typeof insertMcpWorkflowSchema>;
export type McpWorkflow = typeof mcpWorkflows.$inferSelect;

export type InsertMcpExecution = z.infer<typeof insertMcpExecutionSchema>;
export type McpExecution = typeof mcpExecutions.$inferSelect;

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type McpContent = z.infer<typeof mcpContentSchema>;
export type McpFunctionCall = z.infer<typeof mcpFunctionCallSchema>;
export type McpFunctionResponse = z.infer<typeof mcpFunctionResponseSchema>;
export type McpWorkflowStep = z.infer<typeof mcpWorkflowStepSchema>;