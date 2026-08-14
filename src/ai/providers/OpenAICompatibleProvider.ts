import { OpenAIProvider } from './OpenAIProvider.js';
import type { AIProvider, ProviderFactoryConfig, AIProviderFactory } from '../types.js';

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
