import { describe, it, expect, vi } from 'vitest';
import { createAWSCloudProvider } from '../../src/cloud/aws/AWSCloudProvider.js';
import { createAWSTool } from '../../src/cloud/aws/AWSTool.js';
import { createVercelCloudProvider } from '../../src/cloud/vercel/VercelCloudProvider.js';
import { createGitHubProvider } from '../../src/github/GitHubProvider.js';
import type { CommandExecutor } from '../../src/shell/CommandExecutor.js';

describe('AWS Cloud Provider', () => {
  const provider = createAWSCloudProvider();

  it('has read-only operations', () => {
    const ops = provider.getReadOperations();
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.every((o) => o.classification === 'read')).toBe(true);
  });

  it('builds commands for operations', () => {
    expect(provider.buildCommand('s3_list_buckets')).toBe('aws s3 ls');
    expect(provider.buildCommand('sts_get_caller_identity')).toContain('get-caller-identity');
  });

  it('executes via mocked executor', async () => {
    const executeMock = vi.fn().mockResolvedValue({
      stdout: 'bucket-list',
      stderr: '',
      exitCode: 0,
      durationMs: 100,
      command: 'aws s3 ls',
      dryRun: false,
    });
    const mockExecutor: CommandExecutor = {
      execute: executeMock,
    };

    const tool = createAWSTool(mockExecutor);
    const result = await tool.execute(
      { operation: 's3_list_buckets' },
      {
        sessionId: 't',
        dryRun: false,
        planMode: false,
        workingDirectory: '.',
        requestConfirmation: () => Promise.resolve(true),
      },
    );

    expect(result.stdout).toBe('bucket-list');
    expect(executeMock).toHaveBeenCalledWith('aws s3 ls', expect.any(Object));
  });
});

describe('Vercel Cloud Provider', () => {
  const provider = createVercelCloudProvider();

  it('lists read operations', () => {
    expect(provider.getReadOperations().map((o) => o.name)).toContain('list_projects');
  });
});

describe('GitHub Provider', () => {
  const provider = createGitHubProvider();

  it('builds repo list command', () => {
    expect(provider.buildCommand('list_repos')).toBe('gh repo list');
  });

  it('builds search command with query', () => {
    expect(provider.buildCommand('search_code', { query: 'terraform' })).toContain('terraform');
  });
});
