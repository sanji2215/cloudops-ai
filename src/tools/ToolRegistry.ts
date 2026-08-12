import type { AgentTool } from './AgentTool.js';
import { toolToDefinition } from './AgentTool.js';
import type { ToolDefinition } from '../ai/types.js';
import { getLogger } from '../logging/index.js';

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    getLogger().debug(`Registered tool: ${tool.name}`);
  }

  registerMany(tools: AgentTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getOrThrow(name: string): AgentTool {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return tool;
  }

  list(): AgentTool[] {
    return [...this.tools.values()];
  }

  getDefinitions(): ToolDefinition[] {
    return this.list().map(toolToDefinition);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }
}

export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
