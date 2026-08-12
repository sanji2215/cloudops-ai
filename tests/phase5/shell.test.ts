import { describe, it, expect } from 'vitest';
import { createCommandValidator } from '../../src/shell/CommandValidator.js';
import { parseCommand } from '../../src/shell/CommandExecutor.js';
import { redactSecrets } from '../../src/security/SecretRedactor.js';

describe('CommandValidator', () => {
  const validator = createCommandValidator();

  it('classifies read commands', () => {
    expect(validator.classify('aws s3 ls')).toBe('read');
    expect(validator.classify('aws ec2 describe-instances')).toBe('read');
    expect(validator.classify('gh repo list')).toBe('read');
    expect(validator.classify('vercel ls')).toBe('read');
  });

  it('classifies write commands', () => {
    expect(validator.classify('vercel deploy')).toBe('write');
    expect(validator.classify('git push origin main')).toBe('write');
    expect(validator.classify('aws s3 cp file.txt s3://bucket/')).toBe('write');
  });

  it('classifies destructive commands', () => {
    expect(validator.classify('aws ec2 terminate-instances --instance-ids i-123')).toBe('destructive');
    expect(validator.classify('git push --force')).toBe('destructive');
    expect(validator.classify('aws s3 rb s3://bucket --force')).toBe('destructive');
  });

  it('rejects non-allowlisted binaries', () => {
    const result = validator.validate('curl https://example.com');
    expect(result.valid).toBe(false);
  });

  it('allows allowlisted binaries', () => {
    const result = validator.validate('aws sts get-caller-identity');
    expect(result.valid).toBe(true);
  });

  it('blocks configured patterns', () => {
    const strictValidator = createCommandValidator(['rm -rf']);
    const result = strictValidator.validate('aws s3 ls && rm -rf /');
    expect(result.valid).toBe(false);
  });
});

describe('parseCommand', () => {
  it('parses simple commands', () => {
    const parsed = parseCommand('aws s3 ls');
    expect(parsed.binary).toBe('aws');
    expect(parsed.args).toEqual(['s3', 'ls']);
  });

  it('handles quoted arguments', () => {
    const parsed = parseCommand('gh search code "my query"');
    expect(parsed.args).toContain('my query');
  });
});

describe('Secret redaction in command output', () => {
  it('redacts secrets from simulated command output', () => {
    const output = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nSecret key: sk-abcdefghijklmnopqrstuvwxyz';
    const redacted = redactSecrets(output);
    expect(redacted).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(redacted).toContain('[REDACTED]');
  });
});

describe('Mock command executor', () => {
  it('returns dry-run output without executing', async () => {
    const { createCommandExecutor } = await import('../../src/shell/ShellCommandExecutor.js');
    const executor = createCommandExecutor();
    const result = await executor.execute('aws s3 ls', { dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.stdout).toContain('DRY RUN');
  });
});
