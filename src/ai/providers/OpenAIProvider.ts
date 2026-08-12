import OpenAI from 'openai';
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

const DEFAULT_MODEL = 'gpt-4o-mini';

const OPENAI_MODELS: ModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128_000,
    supportsToolCalling: true,
    supportsStructuredOutput: true,
    supportsVision: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128_000,
    supportsToolCalling: true,
    supportsStructuredOutput: true,
  },
];

function mapOpenAIError(error: unknown, providerId: string): AIProviderError {
  if (error instanceof OpenAI.APIError) {
    const retryable = error.status === 429 || error.status >= 500;
    let code: AIProviderError['code'] = 'unknown';
    if (error.status === 429) code = 'rate_limit';
    else if (error.status === 401 || error.status === 403) code = 'auth_error';
    else if (error.status === 404) code = 'model_not_found';
    else if (error.status === 408) code = 'timeout';
    else if (error.status && error.status >= 500) code = 'server_error';
    else code = 'invalid_request';

    return new AIProviderError(error.message, code, providerId, retryable, error);
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new AIProviderError('Request timed out', 'timeout', providerId, true, error);
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return new AIProviderError(message, 'unknown', providerId, false, error);
}

export class OpenAIProvider implements AIProvider {
  readonly id: string;
  readonly name: string;

  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly apiKey: string;

  constructor(config: ProviderFactoryConfig & { id?: string; name?: string }) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.id = config.id ?? 'openai';
    this.name = config.name ?? 'OpenAI';
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs ?? 60_000,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    });
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  supports(feature: AIProviderFeature): boolean {
    switch (feature) {
      case 'chat':
      case 'streaming':
      case 'tool_calling':
      case 'structured_output':
      case 'vision':
      case 'long_context':
        return true;
      default:
        return false;
    }
  }

  getModels(): Promise<ModelInfo[]> {
    return Promise.resolve(OPENAI_MODELS);
  }

  private buildMessages(request: AIRequest): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    for (const msg of request.messages) {
      if (msg.role === 'tool') {
        messages.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId ?? 'unknown',
        });
      } else if (msg.role === 'assistant') {
        messages.push({ role: 'assistant', content: msg.content });
      } else {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    return messages;
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const model = request.model ?? this.defaultModel;

    try {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages: this.buildMessages(request),
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
        ...(request.tools && request.tools.length > 0
          ? {
              tools: request.tools.map((t) => ({
                type: 'function' as const,
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters,
                },
              })),
            }
          : {}),
        ...(request.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
      };

      const completion = await this.client.chat.completions.create(params);
      const choice = completion.choices[0];

      if (!choice) {
        throw new AIProviderError('No response from OpenAI', 'unknown', this.id);
      }

      const toolCalls = choice.message.tool_calls?.map((tc) => {
        const fn = tc.function;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(fn.arguments) as Record<string, unknown>;
        } catch {
          args = {};
        }
        return {
          id: tc.id,
          name: fn.name,
          arguments: args,
        };
      });

      return {
        content: choice.message.content ?? '',
        model: completion.model,
        provider: this.id,
        ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
        finishReason:
          choice.finish_reason === 'tool_calls'
            ? 'tool_calls'
            : choice.finish_reason === 'length'
              ? 'length'
              : 'stop',
        ...(completion.usage
          ? {
              usage: {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens,
                totalTokens: completion.usage.total_tokens,
              },
            }
          : {}),
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw mapOpenAIError(error, this.id);
    }
  }

  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    const model = request.model ?? this.defaultModel;

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: this.buildMessages(request),
        stream: true,
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          yield { type: 'content', content: delta.content };
        }
        if (chunk.choices[0]?.finish_reason) {
          yield { type: 'done', finishReason: chunk.choices[0].finish_reason };
        }
      }
    } catch (error) {
      const mapped = mapOpenAIError(error, this.id);
      yield { type: 'error', error: mapped.message };
    }
  }
}

export const openAIFactory: AIProviderFactory = {
  create(config: ProviderFactoryConfig): AIProvider | null {
    if (!config.apiKey) return null;
    return new OpenAIProvider(config);
  },
};
