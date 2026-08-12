import { describe, it, expect } from 'vitest';
import { redactSecrets, redactObject, containsSecret } from '../../src/security/SecretRedactor.js';
import { createCommandValidator } from '../../src/shell/CommandValidator.js';
import { createToolPermissionManager } from '../../src/tools/permissions/ToolPermissionManager.js';
import type { CloudOpsConfig } from '../../src/config/schema.js';

const config: CloudOpsConfig = {
  logLevel: 'info',
  routing: { default: { provider: 'openai' } },
  providers: {},
  tools: { shell: true, aws: true, cloudflare: true, vercel: true, github: true },
  security: { mode: 'strict', confirmDestructive: true, confirmWrite: true, allowedReadCommands: [], blockedCommands: ['--force'] },
  agent: { maxIterations: 20, maxToolCallsPerIteration: 5 },
  fallbackEnabled: true,
};

describe('Security hardening', () => {
  it('redacts multiple secret types', () => {
    const input = [
      'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890',
      'ghp_1234567890123456789012345678901234',
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def',
      'password=supersecret123456',
    ].join('\n');

    const redacted = redactSecrets(input);
    expect(containsSecret(redacted)).toBe(false);
  });

  it('redacts nested object secrets', () => {
    const obj = {
      config: { apiKey: 'sk-test123456789012345678901234', region: 'us-east-1' },
    };
    const redacted = redactObject(obj);
    expect(redacted.config.apiKey).toBe('[REDACTED]');
    expect(redacted.config.region).toBe('us-east-1');
  });

  it('blocks destructive command patterns', () => {
    const validator = createCommandValidator(config.security.blockedCommands);
    expect(validator.validate('git push --force origin main').valid).toBe(false);
  });

  it('blocks all write operations in strict mode', () => {
    const pm = createToolPermissionManager(config);
    expect(pm.evaluate('write', 'deploy', false).allowed).toBe(false);
    expect(pm.evaluate('read', 'inspect', false).allowed).toBe(true);
  });

  it('never exposes credentials in error paths', () => {
    const errorMsg = 'Auth failed with key sk-abcdefghijklmnopqrstuvwxyz1234567890';
    expect(redactSecrets(errorMsg)).not.toContain('sk-abc');
  });
});
