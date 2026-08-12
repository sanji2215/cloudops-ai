import { describe, it, expect, beforeEach } from 'vitest';
import { createModelRouter } from '../../src/ai/ModelRouter.js';
import { createAIProviderRegistry } from '../../src/ai/index.js';
import { AIProviderError } from '../../src/ai/types.js';
import type { AIProvider, AIRequest, AIResponse } from '../../src/ai/types.js';
import type { CloudOpsConfig } from '../../src/config/schema.js';

class MockProvider implements AIProvider {
  readonly id: string;
  readonly name: string;
  private available: boolean;
  shouldFail = false;
  failCode: AIProviderError['code'] = 'rate_limit';

  constructor(id: string, available = true) {
    this.id = id;
    this.name = id;
    this.available = available;
  }

  isAvailable() { return this.available; }
  supports() { return true; }
  getModels() {
    return Promise.resolve([{ id: 'mock', name: 'Mock', provider: this.id }]);
  }

  chat(_req: AIRequest): Promise<AIResponse> {
    if (this.shouldFail) {
      return Promise.reject(new AIProviderError('Failed', this.failCode, this.id, true));
    }
    return Promise.resolve({
      content: `Response from ${this.id}`,
      model: 'mock',
      provider: this.id,
    });
  }
}

function baseConfig(overrides: Partial<CloudOpsConfig> = {}): CloudOpsConfig {
  return {
    logLevel: 'info',
    routing: {
      default: { provider: 'openai' },
      fallback: { provider: 'gemini' },
    },
    providers: {},
    tools: { shell: true, aws: true, cloudflare: true, vercel: true, github: true },
    security: { mode: 'standard', confirmDestructive: true, confirmWrite: false, allowedReadCommands: [], blockedCommands: [] },
    agent: { maxIterations: 20, maxToolCallsPerIteration: 5 },
    fallbackEnabled: true,
    ...overrides,
  };
}

describe('ModelRouter', () => {
  let registry: ReturnType<typeof createAIProviderRegistry>;

  beforeEach(() => {
    registry = createAIProviderRegistry();
    registry.register(new MockProvider('openai'));
    registry.register(new MockProvider('gemini'));
    registry.register(new MockProvider('anthropic'));
  });

  it('selects default provider', () => {
    const router = createModelRouter(registry, baseConfig());
    const selection = router.selectProvider('default');
    expect(selection.provider.id).toBe('openai');
    expect(selection.usedFallback).toBe(false);
  });

  it('uses explicit provider when specified', () => {
    const router = createModelRouter(registry, baseConfig());
    const selection = router.selectProvider('default', { explicitProvider: 'anthropic' });
    expect(selection.provider.id).toBe('anthropic');
  });

  it('falls back when primary unavailable', () => {
    registry.register(new MockProvider('openai', false));
    const router = createModelRouter(registry, baseConfig());
    const selection = router.selectProvider('default');
    expect(selection.usedFallback).toBe(true);
    expect(selection.provider.id).toBe('gemini');
  });

  it('falls back on retryable provider error', async () => {
    const primary = new MockProvider('openai');
    primary.shouldFail = true;
    registry.register(primary);

    const router = createModelRouter(registry, baseConfig());
    const result = await router.chat({ messages: [{ role: 'user', content: 'test' }] });
    expect(result.provider).toBe('gemini');
    expect(result.route.usedFallback).toBe(true);
  });

  it('does not fallback when explicit provider fails', async () => {
    const primary = new MockProvider('openai');
    primary.shouldFail = true;
    registry.register(primary);

    const router = createModelRouter(registry, baseConfig());
    await expect(
      router.chat(
        { messages: [{ role: 'user', content: 'test' }] },
        'default',
        { explicitProvider: 'openai' },
      ),
    ).rejects.toThrow();
  });
});
