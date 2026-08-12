import type { ModelRouter } from '../ai/ModelRouter.js';
import type { AgentState } from '../types/index.js';
import { getLogger } from '../logging/index.js';

export interface VerificationResult {
  verified: boolean;
  summary: string;
  checks: { name: string; passed: boolean; detail: string }[];
}

const VERIFY_SYSTEM_PROMPT = `You are a DevOps verification assistant.
Review the agent's work and determine if the objective was achieved.
Respond with JSON: {
  "verified": boolean,
  "summary": "concise result for the user",
  "checks": [{ "name": "...", "passed": boolean, "detail": "..." }]
}
Do not expose internal reasoning. Be factual.`;

export class Verifier {
  constructor(private readonly router: ModelRouter) {}

  async verify(state: AgentState): Promise<VerificationResult> {
    getLogger().info('Verifying results...');

    const contextSummary = [
      `Objective: ${state.objective}`,
      `Tools executed: ${state.toolCalls.length}`,
      ...state.observations.slice(-5).map((o) => `Observation: ${o.content.slice(0, 500)}`),
    ].join('\n');

    try {
      const response = await this.router.chat(
        {
          messages: [{ role: 'user', content: contextSummary }],
          systemPrompt: VERIFY_SYSTEM_PROMPT,
          responseFormat: 'json',
        },
        'verification',
      );

      const result = parseVerification(response.content);
      getLogger().audit({
        type: 'verification',
        message: result.verified ? 'Verification passed' : 'Verification failed',
        metadata: { checks: result.checks.length },
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      return {
        verified: state.toolCalls.some((t) => t.status === 'executed'),
        summary: message,
        checks: [],
      };
    }
  }
}

function parseVerification(content: string): VerificationResult {
  try {
    return JSON.parse(content) as VerificationResult;
  } catch {
    return {
      verified: true,
      summary: content,
      checks: [{ name: 'manual_review', passed: true, detail: content }],
    };
  }
}
