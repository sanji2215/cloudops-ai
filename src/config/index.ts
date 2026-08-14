import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { parse as parseYaml } from 'yaml';
import {
  CloudOpsConfigSchema,
  type CloudOpsConfig,
  type ConfigOverrides,
  type ProviderId,
  ConfigError,
} from './schema.js';

const DEFAULT_CONFIG_PATHS = [
  'cloudops.config.yaml',
  'cloudops.config.yml',
  '.cloudops/config.yaml',
];

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  return value === '' ? undefined : value;
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function loadConfigFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }
  const content = readFileSync(path, 'utf-8');
  if (path.endsWith('.json')) {
    return JSON.parse(content) as Record<string, unknown>;
  }
  return parseYaml(content) as Record<string, unknown>;
}

function buildProviderConfig(): CloudOpsConfig['providers'] {
  const providers: CloudOpsConfig['providers'] = {};

  interface ProviderEnvConfig {
    keyEnv: string;
    urlEnv?: string;
    modelEnv?: string;
    defaultBaseUrl?: string;
  }

  const providerEnvMap: Record<ProviderId, ProviderEnvConfig> = {
    openai: { keyEnv: 'OPENAI_API_KEY', modelEnv: 'OPENAI_DEFAULT_MODEL' },
    anthropic: { keyEnv: 'ANTHROPIC_API_KEY', modelEnv: 'ANTHROPIC_DEFAULT_MODEL' },
    gemini: { keyEnv: 'GEMINI_API_KEY', modelEnv: 'GEMINI_DEFAULT_MODEL' },
    xai: {
      keyEnv: 'XAI_API_KEY',
      defaultBaseUrl: 'https://api.x.ai/v1',
      modelEnv: 'XAI_DEFAULT_MODEL',
    },
    groq: {
      keyEnv: 'GROQ_API_KEY',
      defaultBaseUrl: 'https://api.groq.com/openai/v1',
      modelEnv: 'GROQ_DEFAULT_MODEL',
    },
    perplexity: {
      keyEnv: 'PERPLEXITY_API_KEY',
      defaultBaseUrl: 'https://api.perplexity.ai',
      modelEnv: 'PERPLEXITY_DEFAULT_MODEL',
    },
    custom: {
      keyEnv: 'CUSTOM_AI_API_KEY',
      urlEnv: 'CUSTOM_AI_BASE_URL',
      modelEnv: 'CUSTOM_AI_MODEL',
    },
  };

  for (const [id, env] of Object.entries(providerEnvMap) as [ProviderId, ProviderEnvConfig][]) {
    const apiKey = readEnv(env.keyEnv);
    if (apiKey) {
      const baseUrl = (env.urlEnv && readEnv(env.urlEnv)) || env.defaultBaseUrl;
      providers[id] = {
        apiKey,
        enabled: true,
        timeoutMs: 60_000,
        ...(baseUrl ? { baseUrl } : {}),
        ...(env.modelEnv && readEnv(env.modelEnv) ? { defaultModel: readEnv(env.modelEnv) } : {}),
      };
    }
  }

  return providers;
}

function mergeConfig(
  fileConfig: Record<string, unknown>,
  overrides: ConfigOverrides,
): CloudOpsConfig {
  const defaultProvider = (overrides.defaultProvider ??
    readEnv('CLOUDOPS_DEFAULT_PROVIDER') ??
    'groq') as CloudOpsConfig['routing']['default']['provider'];

  const fileRouting =
    typeof fileConfig['routing'] === 'object' && fileConfig['routing'] !== null
      ? (fileConfig['routing'] as Record<string, unknown>)
      : undefined;
  const fileDefault =
    fileRouting &&
    typeof fileRouting['default'] === 'object' &&
    fileRouting['default'] !== null
      ? (fileRouting['default'] as Record<string, unknown>)
      : undefined;
  const fileFallback =
    fileRouting &&
    typeof fileRouting['fallback'] === 'object' &&
    fileRouting['fallback'] !== null
      ? (fileRouting['fallback'] as Record<string, unknown>)
      : undefined;

  const raw = {
    logLevel: overrides.verbose
      ? 'debug'
      : (overrides.logLevel ?? readEnv('CLOUDOPS_LOG_LEVEL') ?? fileConfig['logLevel'] ?? 'info'),
    routing: {
      default: {
        provider: defaultProvider,
        model:
          overrides.defaultModel ??
          readEnv('CLOUDOPS_DEFAULT_MODEL') ??
          (typeof fileDefault?.['model'] === 'string' ? fileDefault['model'] : undefined),
      },
      ...(fileRouting ?? {}),
      fallback: {
        provider:
          overrides.fallbackProvider ??
          readEnv('CLOUDOPS_FALLBACK_PROVIDER') ??
          (typeof fileFallback?.['provider'] === 'string' ? fileFallback['provider'] : 'gemini'),
        ...(fileFallback ?? {}),
      },
    },
    providers: {
      ...buildProviderConfig(),
      ...(typeof fileConfig['providers'] === 'object' && fileConfig['providers'] !== null
        ? fileConfig['providers']
        : {}),
    },
    tools: fileConfig['tools'] ?? {},
    security: {
      confirmDestructive: parseBool(readEnv('CLOUDOPS_CONFIRM_DESTRUCTIVE'), true),
      confirmWrite: parseBool(readEnv('CLOUDOPS_CONFIRM_WRITE'), false),
      allowedReadCommands: [],
      blockedCommands: [],
      ...(fileConfig['security'] as object),
      ...(overrides.securityMode ? { mode: overrides.securityMode } : {}),
      ...(!overrides.securityMode && readEnv('CLOUDOPS_SECURITY_MODE')
        ? { mode: readEnv('CLOUDOPS_SECURITY_MODE') }
        : {}),
      ...(!overrides.securityMode && !readEnv('CLOUDOPS_SECURITY_MODE') ? { mode: 'standard' } : {}),
    },
    agent: fileConfig['agent'] ?? {},
    fallbackEnabled: overrides.fallbackEnabled ?? parseBool(readEnv('CLOUDOPS_FALLBACK_ENABLED'), true),
    configFile: overrides.configFile,
  };

  const result = CloudOpsConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError('Invalid CloudOps configuration', result.error.issues);
  }
  return result.data;
}

export function loadConfig(overrides: ConfigOverrides = {}): CloudOpsConfig {
  loadDotenv();

  let fileConfig: Record<string, unknown> = {};
  const configPath =
    overrides.configFile ??
    DEFAULT_CONFIG_PATHS.map((p) => resolve(process.cwd(), p)).find((p) => existsSync(p));

  if (configPath) {
    fileConfig = loadConfigFile(configPath);
  }

  return mergeConfig(fileConfig, { ...overrides, configFile: configPath });
}

export { ConfigError } from './schema.js';

export function getConfiguredProviders(config: CloudOpsConfig): ProviderId[] {
  return (Object.entries(config.providers) as [ProviderId, CloudOpsConfig['providers'][ProviderId]][])
    .filter(([, cfg]) => cfg?.enabled && cfg.apiKey)
    .map(([id]) => id);
}
