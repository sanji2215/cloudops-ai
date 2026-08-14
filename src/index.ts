export const VERSION = '0.1.0';
export const APP_NAME = 'CloudOps AI';

export { loadConfig, getConfiguredProviders, ConfigError } from './config/index.js';
export type { CloudOpsConfig, ConfigOverrides, ProviderId, TaskType } from './config/schema.js';

export { createLogger, getLogger, initLogger } from './logging/index.js';
export type { Logger, LoggerOptions } from './logging/index.js';

export { redactSecrets, containsSecret, redactObject } from './security/index.js';

export { createConfiguredAIRegistry, createAIProviderRegistry, AIProviderError } from './ai/index.js';
export { createModelRouter } from './ai/ModelRouter.js';
export type { AIProvider, AIRequest, AIResponse, ModelInfo } from './ai/index.js';

export {
  createToolRegistry,
  createToolManager,
  createToolPermissionManager,
  createConfirmationSystem,
} from './tools/index.js';

export { createCommandExecutor, createCommandValidator } from './shell/index.js';

export { createAgent } from './agent/index.js';
export { createAgentService } from './service/index.js';
export type { AgentOptions, AgentResult } from './agent/index.js';

export { buildVercelDeployArgs, deployRepository, validateGitRepository } from './deploy/index.js';
export type { DeployOptions, DeployResult } from './deploy/index.js';

export { createSessionMemory, createProjectMemory } from './memory/index.js';

export type {
  AgentState,
  AgentStatus,
  Message,
  PlanStep,
  Observation,
  ToolCallRecord,
  ToolContext,
  ConfirmationPrompt,
  CommandResult,
  CommandClassification,
  AuditEvent,
  LogLevel,
  RiskLevel,
} from './types/index.js';
