import type { CloudOpsConfig } from '../config/schema.js';
import type { ModelRouter } from '../ai/ModelRouter.js';
import type { ToolManager } from '../tools/ToolManager.js';
import type { ConfirmationSystem } from '../tools/permissions/ConfirmationSystem.js';
import type { AgentState, ToolContext } from '../types/index.js';
import {
  createAgentState,
  setAgentStatus,
  addMessage,
  getProgressSummary,
} from './AgentState.js';
import { Planner, formatPlanForDisplay } from './Planner.js';
import { Executor } from './Executor.js';
import { Verifier } from './Verifier.js';
import { getLogger } from '../logging/index.js';

export interface AgentOptions {
  dryRun?: boolean;
  planMode?: boolean;
  explicitProvider?: string;
  explicitModel?: string;
  workingDirectory?: string;
  maxIterations?: number;
  onProgress?: (summary: string) => void;
  onMessage?: (content: string) => void;
  onStream?: (chunk: string) => void;
}

export interface AgentResult {
  state: AgentState;
  response: string;
  verified: boolean;
  plan?: string;
}

const AGENT_SYSTEM_PROMPT = `You are CloudOps AI, an expert Cloud and DevOps assistant.
You help users inspect and manage cloud infrastructure across AWS, Cloudflare, Vercel, and GitHub.

Rules:
- Use available tools for all infrastructure operations. Never suggest running raw shell commands directly.
- Prefer read-only inspection before suggesting changes.
- Be concise. Do not expose chain-of-thought.
- When a tool returns data, analyze it and provide clear actionable insights.
- If you need to call a tool, use the tool calling interface.`;

export class Agent {
  private readonly planner: Planner;
  private readonly executor: Executor;
  private readonly verifier: Verifier;

  constructor(
    private readonly router: ModelRouter,
    private readonly toolManager: ToolManager,
    private readonly confirmation: ConfirmationSystem,
    private readonly config: CloudOpsConfig,
  ) {
    this.planner = new Planner(router);
    this.executor = new Executor(toolManager);
    this.verifier = new Verifier(router);
  }

  async run(objective: string, options: AgentOptions = {}): Promise<AgentResult> {
    const logger = getLogger();
    logger.audit({ type: 'user_request', message: objective });

    let state = createAgentState(objective);
    state = addMessage(state, { role: 'user', content: objective });

    const toolContext = this.buildToolContext(options);

    if (options.planMode) {
      state = await this.planner.createPlan(state, true);
      options.onProgress?.(formatPlanForDisplay(state.plan));
    }

    state = setAgentStatus(state, 'executing');
    const maxIterations = options.maxIterations ?? this.config.agent.maxIterations;

    for (let i = 0; i < maxIterations; i++) {
      options.onProgress?.(getProgressSummary(state));

      const tools = this.toolManager.getToolDefinitions();
      const response = await this.router.chat(
        {
          messages: state.messages,
          systemPrompt: AGENT_SYSTEM_PROMPT,
          tools,
        },
        'default',
        {
          explicitProvider: options.explicitProvider,
          explicitModel: options.explicitModel,
        },
      );

      if (response.content) {
        state = addMessage(state, { role: 'assistant', content: response.content });
        options.onMessage?.(response.content);
        options.onStream?.(response.content);
      }

      if (!response.toolCalls || response.toolCalls.length === 0) {
        break;
      }

      state = await this.executor.executeToolCalls(state, response.toolCalls, toolContext);
    }

    state = setAgentStatus(state, 'verifying');
    const verification = await this.verifier.verify(state);

    state = setAgentStatus(state, verification.verified ? 'completed' : 'failed');

    const lastAssistant = [...state.messages].reverse().find((m) => m.role === 'assistant');

    return {
      state,
      response: verification.summary || lastAssistant?.content || 'Task completed.',
      verified: verification.verified,
      ...(options.planMode ? { plan: formatPlanForDisplay(state.plan) } : {}),
    };
  }

  private buildToolContext(options: AgentOptions): ToolContext {
    return {
      sessionId: `session_${Date.now()}`,
      dryRun: options.dryRun ?? false,
      planMode: options.planMode ?? false,
      workingDirectory: options.workingDirectory ?? process.cwd(),
      requestConfirmation: (prompt) => this.confirmation.confirm(prompt),
    };
  }
}

export function createAgent(
  router: ModelRouter,
  toolManager: ToolManager,
  confirmation: ConfirmationSystem,
  config: CloudOpsConfig,
): Agent {
  return new Agent(router, toolManager, confirmation, config);
}
