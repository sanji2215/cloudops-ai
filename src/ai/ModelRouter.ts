import type { CloudOpsConfig, TaskType } from '../config/schema.js';
import type { AIProviderRegistry } from './AIProviderRegistry.js';
import type { AIProvider, AIRequest, AIResponse, AIProviderFeature } from './types.js';
import { AIProviderError } from './types.js';
import { getLogger } from '../logging/index.js';

export interface RouteSelection {
  provider: AIProvider;
  model?: string;
  taskType: TaskType;
  usedFallback: boolean;
  fallbackReason?: string;
}

export interface ModelRouterOptions {
  explicitProvider?: string;
  explicitModel?: string;
  fallbackEnabled?: boolean;
}

export class ModelRouter {
  constructor(
    private readonly registry: AIProviderRegistry,
    private readonly config: CloudOpsConfig,
  ) {}

  selectProvider(
    taskType: TaskType = 'default',
    options: ModelRouterOptions = {},
  ): RouteSelection {
    const logger = getLogger();

    if (options.explicitProvider) {
      const provider = this.registry.getOrThrow(options.explicitProvider);
      if (!provider.isAvailable()) {
        throw new Error(`Explicitly selected provider unavailable: ${options.explicitProvider}`);
      }
      logger.debug(`Using explicit provider: ${options.explicitProvider}`);
      return {
        provider,
        model: options.explicitModel,
        taskType,
        usedFallback: false,
      };
    }

    const routeTarget = this.resolveRoute(taskType);
    const provider = this.registry.get(routeTarget.provider);

    if (!provider?.isAvailable()) {
      if (this.config.fallbackEnabled && options.fallbackEnabled !== false) {
        const fallback = this.selectFallback(taskType, routeTarget.provider);
        if (fallback) {
          logger.warn(
            `Provider ${routeTarget.provider} unavailable, falling back to ${fallback.provider.id}`,
          );
          return {
            provider: fallback.provider,
            model: fallback.model ?? routeTarget.model,
            taskType,
            usedFallback: true,
            fallbackReason: `Primary provider ${routeTarget.provider} unavailable`,
          };
        }
      }
      throw new Error(
        `No available AI provider for task "${taskType}". Configure at least one provider API key.`,
      );
    }

    return {
      provider,
      model: routeTarget.model ?? options.explicitModel,
      taskType,
      usedFallback: false,
    };
  }

  async chat(
    request: AIRequest,
    taskType: TaskType = 'default',
    options: ModelRouterOptions = {},
  ): Promise<AIResponse & { route: RouteSelection }> {
    const route = this.selectProvider(taskType, options);
    const enrichedRequest: AIRequest = {
      ...request,
      model: route.model ?? request.model,
      taskType,
    };

    try {
      const response = await route.provider.chat(enrichedRequest);
      getLogger().audit({
        type: 'model_selected',
        message: `Used ${route.provider.id}${route.usedFallback ? ' (fallback)' : ''}`,
        metadata: { model: response.model, taskType },
      });
      return { ...response, route };
    } catch (error) {
      if (
        error instanceof AIProviderError &&
        error.retryable &&
        this.config.fallbackEnabled &&
        options.fallbackEnabled !== false &&
        !options.explicitProvider
      ) {
        const fallback = this.selectFallback(taskType, route.provider.id);
        if (fallback) {
          getLogger().warn(
            `Provider ${route.provider.id} failed (${error.code}), falling back to ${fallback.provider.id}`,
          );
          getLogger().audit({
            type: 'fallback',
            message: `Fallback from ${route.provider.id} to ${fallback.provider.id}`,
            metadata: { reason: error.code, taskType },
          });
          const fallbackResponse = await fallback.provider.chat({
            ...enrichedRequest,
            model: fallback.model ?? enrichedRequest.model,
          });
          return {
            ...fallbackResponse,
            route: {
              provider: fallback.provider,
              model: fallback.model,
              taskType,
              usedFallback: true,
              fallbackReason: error.message,
            },
          };
        }
      }
      throw error;
    }
  }

  providerSupports(providerId: string, feature: AIProviderFeature): boolean {
    const provider = this.registry.get(providerId);
    return provider?.supports(feature) ?? false;
  }

  private resolveRoute(taskType: TaskType) {
    const routing = this.config.routing;
    const taskRoute = routing[taskType as keyof typeof routing];
    if (taskRoute && typeof taskRoute === 'object' && 'provider' in taskRoute) {
      return taskRoute;
    }
    return routing.default;
  }

  private selectFallback(
    taskType: TaskType,
    excludeProviderId: string,
  ): { provider: AIProvider; model?: string } | null {
    const fallbackRoute = this.config.routing.fallback;
    if (fallbackRoute && fallbackRoute.provider !== excludeProviderId) {
      const provider = this.registry.get(fallbackRoute.provider);
      if (provider?.isAvailable()) {
        return { provider, model: fallbackRoute.model };
      }
    }

    const available = this.registry
      .getAvailable()
      .filter((p) => p.id !== excludeProviderId);

    if (available.length === 0) return null;

    const preferred = available.find((p) => {
      if (taskType === 'coding') return p.supports('tool_calling');
      if (taskType === 'research') return p.id === 'perplexity' || p.supports('long_context');
      return true;
    });

    const fallback = preferred ?? available[0];
    if (!fallback) return null;
    return { provider: fallback };
  }
}

export function createModelRouter(
  registry: AIProviderRegistry,
  config: CloudOpsConfig,
): ModelRouter {
  return new ModelRouter(registry, config);
}
