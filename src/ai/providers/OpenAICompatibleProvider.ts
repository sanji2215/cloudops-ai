import { OpenAIProvider } from './OpenAIProvider.js';
import type { AIProvider, ProviderFactoryConfig, AIProviderFactory } from '../types.js';

const DEFAULT_MODEL = 'grok-2-latest';
const DEFAULT_BASE_URL = 'https://api.x.ai/v1';

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
}

export const grokFactory: AIProviderFactory = {
  create(config: ProviderFactoryConfig): AIProvider | null {
    if (!config.apiKey) return null;
    return new GrokProvider(config);
  },
};

export const customOpenAIFactory: AIProviderFactory = {
  create(config: ProviderFactoryConfig): AIProvider | null {
    if (!config.apiKey || !config.baseUrl) return null;
    return new OpenAIProvider({
      ...config,
      id: 'custom',
      name: 'Custom OpenAI-compatible',
    });
  },
};

export { OpenAIProvider } from './OpenAIProvider.js';
