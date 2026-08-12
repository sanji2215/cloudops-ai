import type { CloudOpsConfig, ConfigOverrides } from '../config/schema.js';
import { loadConfig } from '../config/index.js';
import { initLogger } from '../logging/index.js';
import { createConfiguredAIRegistry } from '../ai/index.js';
import { createModelRouter } from '../ai/ModelRouter.js';
import {
  createToolRegistry,
  createToolManager,
  createToolPermissionManager,
  createConfirmationSystem,
} from '../tools/index.js';
import type { ConfirmationHandler } from '../tools/index.js';
import { createCommandExecutor } from '../shell/index.js';
import { createShellTool } from '../tools/implementations/ShellTool.js';
import { createAWSTool } from '../cloud/aws/AWSTool.js';
import { createCloudflareTool } from '../cloud/cloudflare/CloudflareTool.js';
import { createVercelTool } from '../cloud/vercel/VercelTool.js';
import { createGitHubTool } from '../github/GitHubTool.js';
import { createAgent, type Agent, type AgentOptions, type AgentResult } from '../agent/index.js';

export interface AgentServiceOptions extends ConfigOverrides {
  confirmationHandler?: ConfirmationHandler;
}

export class AgentService {
  readonly config: CloudOpsConfig;
  readonly agent: Agent;

  constructor(options: AgentServiceOptions = {}) {
    this.config = loadConfig(options);
    initLogger({ level: this.config.logLevel, name: 'cloudops' });

    const registry = createConfiguredAIRegistry(this.config);
    const router = createModelRouter(registry, this.config);
    const toolRegistry = createToolRegistry();
    const executor = createCommandExecutor();

    if (this.config.tools.shell) {
      toolRegistry.register(createShellTool(executor, this.config));
    }
    if (this.config.tools.aws) {
      toolRegistry.register(createAWSTool(executor));
    }
    if (this.config.tools.cloudflare) {
      toolRegistry.register(createCloudflareTool(executor));
    }
    if (this.config.tools.vercel) {
      toolRegistry.register(createVercelTool(executor));
    }
    if (this.config.tools.github) {
      toolRegistry.register(createGitHubTool(executor));
    }

    const permissions = createToolPermissionManager(this.config);
    const confirmation = createConfirmationSystem(options.confirmationHandler);
    const toolManager = createToolManager(toolRegistry, permissions, confirmation);

    this.agent = createAgent(router, toolManager, confirmation, this.config);
  }

  async run(objective: string, options: AgentOptions = {}): Promise<AgentResult> {
    return this.agent.run(objective, options);
  }
}

export function createAgentService(options: AgentServiceOptions = {}): AgentService {
  return new AgentService(options);
}
