import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIProviderFeature,
  ModelInfo,
  ProviderFactoryConfig,
  AIProviderFactory,
} from '../types.js';
import { AIProviderError } from '../types.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';

const GEMINI_MODELS: ModelInfo[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    contextWindow: 1_000_000,
    supportsToolCalling: true,
    supportsVision: true,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    contextWindow: 2_000_000,
    supportsToolCalling: true,
    supportsVision: true,
  },
];

function mapGeminiError(error: unknown, providerId: string): AIProviderError {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const retryable =
    message.includes('429') || message.includes('503') || message.includes('overloaded');
  let code: AIProviderError['code'] = 'unknown';
  if (message.includes('429')) code = 'rate_limit';
  else if (message.includes('401') || message.includes('API key')) code = 'auth_error';
  else if (message.includes('404')) code = 'model_not_found';
  return new AIProviderError(message, code, providerId, retryable, error);
}

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';

  private readonly client: GoogleGenerativeAI;
  private readonly defaultModel: string;
  private readonly apiKey: string;

  constructor(config: ProviderFactoryConfig) {
    if (!config.apiKey) throw new Error('Gemini API key is required');
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  supports(feature: AIProviderFeature): boolean {
    return ['chat', 'tool_calling', 'vision', 'long_context'].includes(feature);
  }

  getModels(): Promise<ModelInfo[]> {
    return Promise.resolve(GEMINI_MODELS);
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const model = request.model ?? this.defaultModel;

    try {
      const genModel = this.client.getGenerativeModel({
        model,
        ...(request.systemPrompt ? { systemInstruction: request.systemPrompt } : {}),
      });

      const history = request.messages
        .filter((m) => m.role !== 'system')
        .slice(0, -1)
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const lastMessage = request.messages.filter((m) => m.role !== 'system').at(-1);
      const chat = genModel.startChat({ history });

      const result = await chat.sendMessage(lastMessage?.content ?? '');
      const text = result.response.text();

      return {
        content: text,
        model,
        provider: this.id,
        finishReason: 'stop',
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw mapGeminiError(error, this.id);
    }
  }
}

export const geminiFactory: AIProviderFactory = {
  create(config: ProviderFactoryConfig): AIProvider | null {
    if (!config.apiKey) return null;
    return new GeminiProvider(config);
  },
};
