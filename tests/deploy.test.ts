import { describe, expect, it } from 'vitest';
import { buildVercelDeployArgs, deployRepository, validateGitRepository } from '../src/deploy/index.js';

describe('repository deployment', () => {
  it('accepts supported repository URLs', () => {
    expect(validateGitRepository('https://github.com/acme/site.git')).toBe('https://github.com/acme/site.git');
    expect(validateGitRepository('git@gitlab.com:acme/site.git')).toBe('git@gitlab.com:acme/site.git');
  });

  it('rejects unsupported and unsafe repository values', () => {
    expect(() => validateGitRepository('https://example.com/site')).toThrow('Repository must be');
    expect(() => validateGitRepository('git clone https://github.com/acme/site')).toThrow('Repository must be');
  });

  it('builds a production Vercel command with optional scope', () => {
    expect(buildVercelDeployArgs({ token: 'test-token', team: 'acme', project: 'site' })).toEqual([
      'deploy', '--yes', '--prod', '--token', 'test-token', '--scope', 'acme', '--name', 'site',
    ]);
  });

  it('does not expose a token in dry-run output', async () => {
    const result = await deployRepository('https://github.com/acme/site.git', { dryRun: true, token: 'secret-token' });
    expect(result.output).not.toContain('secret-token');
    expect(result.output).toContain('[REDACTED]');
  });
});
