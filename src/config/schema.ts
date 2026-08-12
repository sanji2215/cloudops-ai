import { z } from 'zod';

export const LogLevelSchema = z.enum(['error', 'warn', 'info', 'debug']);

export const SecurityModeSchema = z.enum(['strict', 'standard', 'permissive']);

export const ProviderIdSchema = z.enum([
  'openai',
  'anthropic',
  'gemini',
  'xai',
  'perplexity',
  'custom',
]);

export const TaskTypeSchema = z.enum([
  'default',
  'coding',
  'research',
  'planning',
  'verification',
]);

export const RouteTargetSchema = z.object({
  provider: ProviderIdSchema,
  model: z.string().optional(),
});

export const RoutingConfigSchema = z.object({
  default: RouteTargetSchema,
  coding: RouteTargetSchema.optional(),
  research: RouteTargetSchema.optional(),
  planning: RouteTargetSchema.optional(),
  verification: RouteTargetSchema.optional(),
  fallback: RouteTargetSchema.optional(),
});

export const ProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  defaultModel: z.string().optional(),
  enabled: z.boolean().default(true),
  timeoutMs: z.number().int().positive().default(60_000),
});

export const ToolsConfigSchema = z.object({
  shell: z.boolean().default(true),
  aws: z.boolean().default(true),
  cloudflare: z.boolean().default(true),
  vercel: z.boolean().default(true),
  github: z.boolean().default(true),
});

export const SecurityConfigSchema = z.object({
  mode: SecurityModeSchema.default('standard'),
  confirmDestructive: z.boolean().default(true),
  confirmWrite: z.boolean().default(false),
  allowedReadCommands: z.array(z.string()).default([]),
  blockedCommands: z.array(z.string()).default([]),
});

export const AgentConfigSchema = z.object({
  maxIterations: z.number().int().positive().default(20),
  maxToolCallsPerIteration: z.number().int().positive().default(5),
});

export const CloudOpsConfigSchema = z.object({
  logLevel: LogLevelSchema.default('info'),
  routing: RoutingConfigSchema,
  providers: z.record(ProviderIdSchema, ProviderConfigSchema).default({}),
  tools: ToolsConfigSchema.default({}),
  security: SecurityConfigSchema.default({}),
  agent: AgentConfigSchema.default({}),
  fallbackEnabled: z.boolean().default(true),
  configFile: z.string().optional(),
});

export type CloudOpsConfig = z.infer<typeof CloudOpsConfigSchema>;
export type RoutingConfig = z.infer<typeof RoutingConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ProviderId = z.infer<typeof ProviderIdSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;

export interface ConfigOverrides {
  logLevel?: string;
  defaultProvider?: string;
  defaultModel?: string;
  fallbackProvider?: string;
  fallbackEnabled?: boolean;
  dryRun?: boolean;
  planMode?: boolean;
  verbose?: boolean;
  configFile?: string;
  securityMode?: string;
}

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[] = [],
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}
