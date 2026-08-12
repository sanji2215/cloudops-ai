import type { CloudOpsConfig } from '../config/schema.js';
import { createAIProviderRegistry } from './AIProviderRegistry.js';
import { openAIFactory } from './providers/OpenAIProvider.js';
import { anthropicFactory } from './providers/AnthropicProvider.js';
import { geminiFactory } from './providers/GeminiProvider.js';
import { grokFactory, customOpenAIFactory } from './providers/OpenAICompatibleProvider.js';
import { perplexityFactory } from './providers/PerplexityProvider.js';

export function createConfiguredAIRegistry(config: CloudOpsConfig) {
  const registry = createAIProviderRegistry();

  registry.registerFactory('openai', openAIFactory);
  registry.registerFactory('anthropic', anthropicFactory);
  registry.registerFactory('gemini', geminiFactory);
  registry.registerFactory('xai', grokFactory);
  registry.registerFactory('perplexity', perplexityFactory);
  registry.registerFactory('custom', customOpenAIFactory);

  registry.initializeFromConfig(config);

  return registry;
}

export { createAIProviderRegistry, AIProviderRegistry } from './AIProviderRegistry.js';
export { createModelRouter, ModelRouter } from './ModelRouter.js';
export type { AIProvider, AIProviderFactory } from './AIProvider.js';
export type {
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ModelInfo,
  ToolDefinition,
  ToolCall,
} from './types.js';
export { AIProviderError } from './types.js';
