import { OpenAIProvider } from './OpenAIProvider.js';
import type { AIProvider, ProviderFactoryConfig, AIProviderFactory, ModelInfo } from '../types.js';

const DEFAULT_MODEL = 'sonar';
const DEFAULT_BASE_URL = 'https://api.perplexity.ai';

const PERPLEXITY_MODELS: ModelInfo[] = [
  {
    id: 'sonar',
    name: 'Sonar',
    provider: 'perplexity',
    contextWindow: 127_000,
    supportsToolCalling: false,
  },
  {
    id: 'sonar-pro',
    name: 'Sonar Pro',
    provider: 'perplexity',
    contextWindow: 200_000,
    supportsToolCalling: false,
  },
];

export class PerplexityProvider extends OpenAIProvider {
  constructor(config: ProviderFactoryConfig) {
    super({
      ...config,
      id: 'perplexity',
      name: 'Perplexity',
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      defaultModel: config.defaultModel ?? DEFAULT_MODEL,
    });
  }

  override getModels(): Promise<ModelInfo[]> {
    return Promise.resolve(PERPLEXITY_MODELS);
  }
}

export const perplexityFactory: AIProviderFactory = {
  create(config: ProviderFactoryConfig): AIProvider | null {
    if (!config.apiKey) return null;
    return new PerplexityProvider(config);
  },
};
