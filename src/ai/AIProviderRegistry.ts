import type { CloudOpsConfig, ProviderId } from '../config/schema.js';
import type { AIProvider, AIProviderFactory } from './types.js';
import { getLogger } from '../logging/index.js';

export class AIProviderRegistry {
  private readonly providers = new Map<string, AIProvider>();
  private readonly factories = new Map<string, AIProviderFactory>();

  registerFactory(id: ProviderId, factory: AIProviderFactory): void {
    this.factories.set(id, factory);
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
    getLogger().debug(`Registered AI provider: ${provider.id}`);
  }

  get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  getOrThrow(id: string): AIProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`AI provider not registered: ${id}`);
    }
    return provider;
  }

  getAvailable(): AIProvider[] {
    return [...this.providers.values()].filter((p) => p.isAvailable());
  }

  list(): AIProvider[] {
    return [...this.providers.values()];
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  initializeFromConfig(config: CloudOpsConfig): void {
    for (const [id, providerConfig] of Object.entries(config.providers)) {
      const factory = this.factories.get(id);
      if (!factory) continue;
      if (!providerConfig.enabled || !providerConfig.apiKey) continue;

      const provider = factory.create({
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        defaultModel: providerConfig.defaultModel,
        timeoutMs: providerConfig.timeoutMs,
      });

      if (provider) {
        this.register(provider);
      }
    }
  }
}

export function createAIProviderRegistry(): AIProviderRegistry {
  return new AIProviderRegistry();
}
