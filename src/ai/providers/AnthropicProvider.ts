import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIProviderFeature,
  ModelInfo,
  ProviderFactoryConfig,
  AIProviderFactory,
} from '../types.js';
import { AIProviderError } from '../types.js';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    contextWindow: 200_000,
    supportsToolCalling: true,
    supportsStructuredOutput: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200_000,
    supportsToolCalling: true,
  },
];

function mapAnthropicError(error: unknown, providerId: string): AIProviderError {
  if (error instanceof Anthropic.APIError) {
    const retryable = error.status === 429 || (error.status ?? 0) >= 500;
    let code: AIProviderError['code'] = 'unknown';
    if (error.status === 429) code = 'rate_limit';
    else if (error.status === 401) code = 'auth_error';
    else if (error.status === 404) code = 'model_not_found';
    else if ((error.status ?? 0) >= 500) code = 'server_error';
    return new AIProviderError(error.message, code, providerId, retryable, error);
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return new AIProviderError(message, 'unknown', providerId, false, error);
}

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic';

  private readonly client: Anthropic;
  private readonly defaultModel: string;
  private readonly apiKey: string;

  constructor(config: ProviderFactoryConfig) {
    if (!config.apiKey) throw new Error('Anthropic API key is required');
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeoutMs ?? 60_000,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    });
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  supports(feature: AIProviderFeature): boolean {
    return ['chat', 'streaming', 'tool_calling', 'structured_output', 'long_context'].includes(
      feature,
    );
  }

  getModels(): Promise<ModelInfo[]> {
    return Promise.resolve(ANTHROPIC_MODELS);
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const model = request.model ?? this.defaultModel;

    try {
      const systemMessage = request.systemPrompt ??
        request.messages.find((m) => m.role === 'system')?.content;

      const messages = request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        }));

      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages,
        ...(request.tools && request.tools.length > 0
          ? {
              tools: request.tools.map((t) => ({
                name: t.name,
                description: t.description,
                input_schema: t.parameters as Anthropic.Tool.InputSchema,
              })),
            }
          : {}),
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

      const toolCalls = toolUseBlocks.map((b) => ({
        id: b.id,
        name: b.name,
        arguments: b.input as Record<string, unknown>,
      }));

      return {
        content: textBlock?.type === 'text' ? textBlock.text : '',
        model,
        provider: this.id,
        ...(toolCalls.length > 0 ? { toolCalls } : {}),
        finishReason: response.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw mapAnthropicError(error, this.id);
    }
  }

  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    const model = request.model ?? this.defaultModel;
    try {
      const systemMessage = request.systemPrompt;
      const messages = request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content,
        }));

      const stream = this.client.messages.stream({
        model,
        max_tokens: request.maxTokens ?? 4096,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield { type: 'content', content: event.delta.text };
        }
      }
      yield { type: 'done', finishReason: 'stop' };
    } catch (error) {
      const mapped = mapAnthropicError(error, this.id);
      yield { type: 'error', error: mapped.message };
    }
  }
}

export const anthropicFactory: AIProviderFactory = {
  create(config: ProviderFactoryConfig): AIProvider | null {
    if (!config.apiKey) return null;
    return new AnthropicProvider(config);
  },
};
