import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, getConfiguredProviders, ConfigError } from '../../src/config/index.js';
import { createLogger } from '../../src/logging/index.js';
import { redactSecrets, containsSecret, redactObject } from '../../src/security/index.js';

describe('Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads default configuration', () => {
    const config = loadConfig();
    expect(config.logLevel).toBe('info');
    expect(config.routing.default.provider).toBe('groq');
    expect(config.fallbackEnabled).toBe(true);
  });

  it('reads provider API keys from environment', () => {
    process.env['OPENAI_API_KEY'] = 'sk-test-key-for-unit-tests-only';
    const config = loadConfig();
    expect(config.providers.openai?.apiKey).toBe('sk-test-key-for-unit-tests-only');
    expect(getConfiguredProviders(config)).toContain('openai');
  });

  it('reads the Grok API key and optional model from environment', () => {
    process.env['XAI_API_KEY'] = 'xai-test-key-for-unit-tests-only';
    process.env['XAI_DEFAULT_MODEL'] = 'grok-4.5';

    const config = loadConfig();

    expect(config.providers.xai).toMatchObject({
      apiKey: 'xai-test-key-for-unit-tests-only',
      baseUrl: 'https://api.x.ai/v1',
      defaultModel: 'grok-4.5',
    });
    expect(getConfiguredProviders(config)).toContain('xai');
  });

  it('reads the Groq API key and optional model from environment', () => {
    process.env['GROQ_API_KEY'] = 'gsk-test-key-for-unit-tests-only';
    process.env['GROQ_DEFAULT_MODEL'] = 'openai/gpt-oss-20b';

    const config = loadConfig();

    expect(config.providers.groq).toMatchObject({
      apiKey: 'gsk-test-key-for-unit-tests-only',
      baseUrl: 'https://api.groq.com/openai/v1',
      defaultModel: 'openai/gpt-oss-20b',
    });
    expect(getConfiguredProviders(config)).toContain('groq');
  });

  it('respects verbose override for log level', () => {
    const config = loadConfig({ verbose: true });
    expect(config.logLevel).toBe('debug');
  });

  it('throws ConfigError for invalid security mode', () => {
    expect(() =>
      loadConfig({
        securityMode: 'invalid-mode',
        configFile: '__nonexistent_config_for_test__',
      }),
    ).toThrow(ConfigError);
  });
});

describe('Logger', () => {
  it('creates logger with specified level', () => {
    const logger = createLogger({ level: 'warn', name: 'test' });
    expect(logger.getLevel()).toBe('warn');
  });

  it('creates child logger with namespaced name', () => {
    const parent = createLogger({ name: 'parent' });
    const child = parent.child('child');
    expect(child).toBeDefined();
  });

  it('stores log entries internally', () => {
    const logger = createLogger({ level: 'debug' });
    logger.info('test message');
    expect(logger.getEntries()).toHaveLength(1);
    expect(logger.getEntries()[0]?.message).toBe('test message');
  });
});

describe('SecretRedactor', () => {
  it('redacts OpenAI-style API keys', () => {
    const input = 'Authorization: Bearer sk-abcdefghijklmnopqrstuvwxyz123456';
    const result = redactSecrets(input);
    expect(result).not.toContain('sk-abcdefghijklmnopqrstuvwxyz123456');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts AWS access key IDs', () => {
    const input = 'Key: AKIAIOSFODNN7EXAMPLE';
    expect(redactSecrets(input)).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });

  it('detects secrets in strings', () => {
    expect(containsSecret('token=supersecretvalue123456')).toBe(true);
    expect(containsSecret('hello world')).toBe(false);
  });

  it('redacts sensitive object keys', () => {
    const obj = { apiKey: 'secret123', name: 'test' };
    const result = redactObject(obj);
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.name).toBe('test');
  });
});
