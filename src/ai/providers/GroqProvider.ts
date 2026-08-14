import { OpenAIProvider } from './OpenAIProvider.js';
import type { AIProvider, AIProviderFactory, ModelInfo, ProviderFactoryConfig } from '../types.js';

const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';

const GROQ_MODELS: ModelInfo[] = [
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B',
    provider: 'groq',
    contextWindow: 131_072,
    supportsToolCalling: true,
    supportsStructuredOutput: true,
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B',
    provider: 'groq',
    contextWindow: 131_072,
    supportsToolCalling: true,
    supportsStructuredOutput: true,
  },
];

/**
 * Groq provides an OpenAI-compatible API. Supply a Groq console API key via
 * `GROQ_API_KEY` (or `providers.groq.apiKey`).
 */
export class GroqProvider extends OpenAIProvider {
  constructor(config: ProviderFactoryConfig) {
    super({
      ...config,
      id: 'groq',
      name: 'Groq',
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      defaultModel: config.defaultModel ?? DEFAULT_MODEL,
    });
  }

  override getModels(): Promise<ModelInfo[]> {
    return Promise.resolve(GROQ_MODELS);
  }
}

export const groqFactory: AIProviderFactory = {
  create(config: ProviderFactoryConfig): AIProvider | null {
    if (!config.apiKey) return null;
    return new GroqProvider(config);
  },
};
