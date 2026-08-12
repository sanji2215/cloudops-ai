import type { ToolManager } from '../tools/ToolManager.js';
import type { AgentState, ToolContext } from '../types/index.js';
import { addMessage, addObservation } from './AgentState.js';
import { getLogger } from '../logging/index.js';

export class Executor {
  constructor(private readonly toolManager: ToolManager) {}

  async executeToolCalls(
    state: AgentState,
    toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[],
    context: ToolContext,
  ): Promise<AgentState> {
    let updated = state;

    for (const call of toolCalls) {
      getLogger().info(`Executing tool: ${call.name}`);

      const result = await this.toolManager.execute(call.name, call.arguments, context);

      updated = {
        ...updated,
        toolCalls: [...updated.toolCalls, result.record],
      };

      const observationContent = result.success
        ? JSON.stringify(result.output)
        : `Error: ${result.error}`;

      updated = addObservation(updated, {
        id: `obs_${call.id}`,
        source: 'tool',
        content: observationContent,
        timestamp: new Date(),
      });

      updated = addMessage(updated, {
        role: 'tool',
        content: observationContent,
        name: call.name,
        toolCallId: call.id,
      });

      if (result.dryRunMessage) {
        getLogger().info(result.dryRunMessage);
      }
    }

    return updated;
  }
}
