import { describe, it, expect, beforeEach } from 'vitest';
import { createAIProviderRegistry, AIProviderError } from '../../src/ai/index.js';
import { OpenAIProvider } from '../../src/ai/providers/OpenAIProvider.js';
import type { AIProvider, AIRequest, AIResponse, ProviderFactoryConfig } from '../../src/ai/types.js';

class MockProvider implements AIProvider {
  readonly id: string;
  readonly name: string;
  private readonly available: boolean;
  chatFn: (request: AIRequest) => Promise<AIResponse>;

  constructor(id: string, name: string, available = true) {
    this.id = id;
    this.name = name;
    this.available = available;
    this.chatFn = (req) =>
      Promise.resolve({
        content: `mock response to: ${req.messages.at(-1)?.content ?? ''}`,
        model: 'mock-model',
        provider: id,
      });
  }

  isAvailable(): boolean {
    return this.available;
  }

  supports(): boolean {
    return true;
  }

  getModels(): Promise<{ id: string; name: string; provider: string }[]> {
    return Promise.resolve([{ id: 'mock-model', name: 'Mock Model', provider: this.id }]);
  }

  chat(request: AIRequest): Promise<AIResponse> {
    return this.chatFn(request);
  }
}

describe('AIProviderRegistry', () => {
  let registry: ReturnType<typeof createAIProviderRegistry>;

  beforeEach(() => {
    registry = createAIProviderRegistry();
  });

  it('registers and retrieves providers', () => {
    const provider = new MockProvider('test', 'Test Provider');
    registry.register(provider);
    expect(registry.get('test')).toBe(provider);
    expect(registry.has('test')).toBe(true);
  });

  it('throws for unregistered provider', () => {
    expect(() => registry.getOrThrow('missing')).toThrow('AI provider not registered');
  });

  it('lists only available providers', () => {
    registry.register(new MockProvider('available', 'Available', true));
    registry.register(new MockProvider('unavailable', 'Unavailable', false));
    expect(registry.getAvailable()).toHaveLength(1);
    expect(registry.getAvailable()[0]?.id).toBe('available');
  });

  it('initializes from config with API keys', () => {
    registry.registerFactory('openai', {
      create: (config: ProviderFactoryConfig) => {
        if (!config.apiKey) return null;
        return new MockProvider('openai', 'OpenAI');
      },
    });

    registry.initializeFromConfig({
      logLevel: 'info',
      routing: { default: { provider: 'openai' } },
      providers: {
        openai: { apiKey: 'sk-test', enabled: true, timeoutMs: 60_000 },
      },
      tools: {},
      security: { mode: 'standard', confirmDestructive: true, confirmWrite: false, allowedReadCommands: [], blockedCommands: [] },
      agent: { maxIterations: 20, maxToolCallsPerIteration: 5 },
      fallbackEnabled: true,
    });

    expect(registry.has('openai')).toBe(true);
  });
});

describe('OpenAIProvider', () => {
  it('reports availability based on API key', () => {
    const provider = new OpenAIProvider({ apiKey: 'sk-test-key' });
    expect(provider.isAvailable()).toBe(true);
    expect(provider.id).toBe('openai');
  });

  it('supports expected features', () => {
    const provider = new OpenAIProvider({ apiKey: 'sk-test-key' });
    expect(provider.supports('chat')).toBe(true);
    expect(provider.supports('streaming')).toBe(true);
    expect(provider.supports('tool_calling')).toBe(true);
  });

  it('returns model list', async () => {
    const provider = new OpenAIProvider({ apiKey: 'sk-test-key' });
    const models = await provider.getModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]?.provider).toBe('openai');
  });
});

describe('AIProviderError', () => {
  it('carries retryable flag and error code', () => {
    const error = new AIProviderError('Rate limited', 'rate_limit', 'openai', true);
    expect(error.retryable).toBe(true);
    expect(error.code).toBe('rate_limit');
    expect(error.provider).toBe('openai');
  });
});
