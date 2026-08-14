import { OpenAIProvider } from './OpenAIProvider.js';
import type { AIProvider, AIProviderFactory, ModelInfo, ProviderFactoryConfig } from '../types.js';

const DEFAULT_MODEL = 'grok-4.5';
const DEFAULT_BASE_URL = 'https://api.x.ai/v1';

const GROK_MODELS: ModelInfo[] = [
  {
    id: 'grok-4.5',
    name: 'Grok 4.5',
    provider: 'xai',
    contextWindow: 500_000,
    supportsToolCalling: true,
    supportsStructuredOutput: true,
    supportsVision: true,
  },
];

/**
 * xAI's API uses the OpenAI-compatible Chat Completions protocol. Supply an
 * xAI console API key through `XAI_API_KEY` (or `providers.xai.apiKey`).
 */
export class GrokProvider extends OpenAIProvider {
  constructor(config: ProviderFactoryConfig) {
    super({
      ...config,
      id: 'xai',
      name: 'xAI Grok',
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      defaultModel: config.defaultModel ?? DEFAULT_MODEL,
    });
  }

  override getModels(): Promise<ModelInfo[]> {
    return Promise.resolve(GROK_MODELS);
  }
}

export const grokFactory: AIProviderFactory = {
  create(config: ProviderFactoryConfig): AIProvider | null {
    if (!config.apiKey) return null;
    return new GrokProvider(config);
  },
};
