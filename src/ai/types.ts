import type { Message } from '../types/index.js';

export type AIProviderFeature =
  | 'chat'
  | 'streaming'
  | 'tool_calling'
  | 'structured_output'
  | 'vision'
  | 'long_context';

export type AIProviderErrorCode =
  | 'rate_limit'
  | 'timeout'
  | 'auth_error'
  | 'model_not_found'
  | 'invalid_request'
  | 'server_error'
  | 'network_error'
  | 'unknown';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  supportsToolCalling?: boolean;
  supportsStructuredOutput?: boolean;
  supportsVision?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIRequest {
  messages: Message[];
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  responseFormat?: 'text' | 'json';
  taskType?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  toolCalls?: ToolCall[];
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIStreamChunk {
  type: 'content' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: Partial<ToolCall>;
  finishReason?: string;
  error?: string;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: AIProviderErrorCode,
    public readonly provider: string,
    public readonly retryable: boolean = false,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;

  chat(request: AIRequest): Promise<AIResponse>;

  stream?(request: AIRequest): AsyncIterable<AIStreamChunk>;

  supports(feature: AIProviderFeature): boolean;

  getModels(): Promise<ModelInfo[]>;

  isAvailable(): boolean;
}

export interface AIProviderFactory {
  create(config: ProviderFactoryConfig): AIProvider | null;
}

export interface ProviderFactoryConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
}
