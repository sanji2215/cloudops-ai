import type { ToolRegistry } from './ToolRegistry.js';
import type { ToolPermissionManager } from './permissions/ToolPermissionManager.js';
import type { ConfirmationSystem } from './permissions/ConfirmationSystem.js';
import { riskFromClassification } from './permissions/ConfirmationSystem.js';
import type { ToolContext, ToolCallRecord } from '../types/index.js';
import { getLogger } from '../logging/index.js';
import { redactObject } from '../security/SecretRedactor.js';

export interface ToolExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  record: ToolCallRecord;
  dryRunMessage?: string;
}

export class ToolManager {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly permissions: ToolPermissionManager,
    private readonly confirmation: ConfirmationSystem,
  ) {}

  async execute(
    toolName: string,
    rawInput: unknown,
    context: ToolContext,
  ): Promise<ToolExecutionResult> {
    const logger = getLogger();
    const tool = this.registry.getOrThrow(toolName);
    const startedAt = new Date();
    const callId = `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const record: ToolCallRecord = {
      id: callId,
      toolName,
      input: redactObject(rawInput),
      status: 'pending',
      startedAt,
    };

    logger.audit({
      type: 'tool_call',
      message: `Tool call requested: ${toolName}`,
      metadata: { toolName, dryRun: context.dryRun },
    });

    const parsed = tool.inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      record.status = 'failed';
      record.error = `Invalid input: ${parsed.error.message}`;
      record.completedAt = new Date();
      return { success: false, error: record.error, record };
    }

    const classification = tool.classification ?? 'read';
    const decision = this.permissions.evaluate(classification, toolName, context.dryRun);

    if (!decision.allowed) {
      record.status = 'denied';
      record.error = decision.reason ?? 'Permission denied';
      record.completedAt = new Date();
      return { success: false, error: record.error, record };
    }

    if (decision.requiresConfirmation) {
      const approved = await context.requestConfirmation({
        action: `Execute tool: ${toolName}`,
        target: JSON.stringify(redactObject(parsed.data)),
        impact: `This is a ${classification} operation that may modify infrastructure.`,
        risk: riskFromClassification(classification),
      });

      logger.audit({
        type: 'confirmation',
        message: `Confirmation for ${toolName}: ${approved ? 'approved' : 'denied'}`,
      });

      if (!approved) {
        record.status = 'denied';
        record.error = 'User denied confirmation';
        record.completedAt = new Date();
        return { success: false, error: record.error, record };
      }
    }

    if (context.dryRun && classification !== 'read') {
      const dryRunMessage = `DRY RUN\n\nPlanned action:\n${toolName}(${JSON.stringify(redactObject(parsed.data))})\n\nNo changes have been made.`;
      record.status = 'executed';
      record.completedAt = new Date();
      record.output = { dryRun: true, message: dryRunMessage };
      return { success: true, output: record.output, record, dryRunMessage };
    }

    try {
      const output = await tool.execute(parsed.data, context);
      record.status = 'executed';
      record.output = redactObject(output);
      record.completedAt = new Date();

      logger.audit({
        type: 'result',
        message: `Tool ${toolName} executed successfully`,
      });

      return { success: true, output, record };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      record.status = 'failed';
      record.error = message;
      record.completedAt = new Date();

      logger.audit({
        type: 'error',
        message: `Tool ${toolName} failed: ${message}`,
      });

      return { success: false, error: message, record };
    }
  }

  getToolDefinitions() {
    return this.registry.getDefinitions();
  }
}

export function createToolManager(
  registry: ToolRegistry,
  permissions: ToolPermissionManager,
  confirmation: ConfirmationSystem,
): ToolManager {
  return new ToolManager(registry, permissions, confirmation);
}
