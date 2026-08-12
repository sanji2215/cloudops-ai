export type { AgentTool } from './AgentTool.js';
export { toolToDefinition } from './AgentTool.js';
export { ToolRegistry, createToolRegistry } from './ToolRegistry.js';
export { ToolManager, createToolManager } from './ToolManager.js';
export { ToolPermissionManager, createToolPermissionManager } from './permissions/ToolPermissionManager.js';
export {
  ConfirmationSystem,
  createConfirmationSystem,
  formatConfirmationPrompt,
  riskFromClassification,
  autoApproveConfirmation,
  autoDenyConfirmation,
} from './permissions/ConfirmationSystem.js';
export type { ConfirmationHandler } from './permissions/ConfirmationSystem.js';
export type { PermissionDecision } from './permissions/ToolPermissionManager.js';
export type { ToolExecutionResult } from './ToolManager.js';
