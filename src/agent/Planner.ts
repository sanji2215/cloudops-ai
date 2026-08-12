import type { ModelRouter } from '../ai/ModelRouter.js';
import type { AgentState, PlanStep } from '../types/index.js';
import { addMessage, setPlan, setAgentStatus } from './AgentState.js';
import { getLogger } from '../logging/index.js';

const PLAN_SYSTEM_PROMPT = `You are CloudOps AI, a DevOps planning assistant.
Given a user objective, produce a numbered plan of concrete steps to accomplish it.
Each step should be actionable and reference cloud tools where appropriate.
Respond with JSON: { "steps": [{ "description": "...", "toolName": "optional_tool_name" }] }
Do not include chain-of-thought. Be concise.`;

export class Planner {
  constructor(private readonly router: ModelRouter) {}

  async createPlan(state: AgentState, planMode: boolean): Promise<AgentState> {
    if (!planMode) return state;

    getLogger().info('Generating execution plan...');

    let updated = setAgentStatus(state, 'planning');

    try {
      const response = await this.router.chat(
        {
          messages: [{ role: 'user', content: state.objective }],
          systemPrompt: PLAN_SYSTEM_PROMPT,
          responseFormat: 'json',
        },
        'planning',
      );

      const steps = parsePlanSteps(response.content);
      updated = setPlan(updated, steps);
      updated = addMessage(updated, {
        role: 'assistant',
        content: formatPlanForDisplay(steps),
      });

      getLogger().info(`Plan created with ${steps.length} steps`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Planning failed';
      getLogger().warn(`Plan generation failed: ${message}`);
    }

    return setAgentStatus(updated, 'executing');
  }
}

function parsePlanSteps(content: string): PlanStep[] {
  try {
    const parsed = JSON.parse(content) as { steps?: { description: string; toolName?: string }[] };
    return (parsed.steps ?? []).map((step, i) => ({
      id: `step_${i + 1}`,
      description: step.description,
      status: 'pending' as const,
      ...(step.toolName ? { toolName: step.toolName } : {}),
    }));
  } catch {
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line, i) => ({
        id: `step_${i + 1}`,
        description: line.replace(/^\d+\.\s*/, ''),
        status: 'pending' as const,
      }));
  }
}

export function formatPlanForDisplay(steps: PlanStep[]): string {
  const lines = ['PLAN', ''];
  steps.forEach((step, i) => {
    lines.push(`${i + 1}. ${step.description}`);
  });
  return lines.join('\n');
}
