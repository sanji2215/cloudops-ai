import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

export interface DeployOptions {
  production?: boolean;
  token?: string;
  team?: string;
  project?: string;
  branch?: string;
  dryRun?: boolean;
}

export interface DeployResult {
  url: string | undefined;
  output: string;
}

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

type RunProcess = (command: string, args: string[], cwd?: string) => Promise<ProcessResult>;

const runProcess: RunProcess = (command, args, cwd) =>
  new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error: Error) => {
      stderr += error.message;
    });
    child.on('close', (code) => resolve({ stdout, stderr, exitCode: code ?? 1 }));
  });

export function validateGitRepository(repository: string): string {
  const value = repository.trim();
  const isHttps = /^https:\/\/(?:[^/]+@)?(?:github\.com|gitlab\.com|bitbucket\.org)\/[\w.-]+\/[\w.-]+(?:\.git)?\/?$/i.test(value);
  const isSsh = /^git@(?:github\.com|gitlab\.com|bitbucket\.org):[\w.-]+\/[\w.-]+(?:\.git)?$/i.test(value);

  if (!isHttps && !isSsh) {
    throw new Error(
      'Repository must be a GitHub, GitLab, or Bitbucket HTTPS/SSH repository URL (for example: https://github.com/owner/repo.git).',
    );
  }
  return value;
}

export function buildVercelDeployArgs(options: DeployOptions): string[] {
  const args = ['deploy', '--yes'];
  if (options.production ?? true) args.push('--prod');
  if (options.token) args.push('--token', options.token);
  if (options.team) args.push('--scope', options.team);
  if (options.project) args.push('--name', options.project);
  return args;
}

export async function deployRepository(
  repository: string,
  options: DeployOptions = {},
  execute: RunProcess = runProcess,
): Promise<DeployResult> {
  const validRepository = validateGitRepository(repository);
  const deployArgs = buildVercelDeployArgs({ ...options, token: options.token ?? process.env['VERCEL_TOKEN'] });

  if (options.dryRun) {
    const safeDeployArgs = deployArgs.map((argument, index) =>
      deployArgs[index - 1] === '--token' ? '[REDACTED]' : argument,
    );
    return {
      url: undefined,
      output: `DRY RUN: Would clone ${validRepository} and run vercel ${safeDeployArgs.join(' ')}`,
    };
  }

  const directory = await mkdtemp(join(tmpdir(), 'cloudops-deploy-'));
  try {
    const cloneArgs = ['clone', '--depth', '1'];
    if (options.branch) cloneArgs.push('--branch', options.branch);
    cloneArgs.push(validRepository, directory);
    const clone = await execute('git', cloneArgs);
    if (clone.exitCode !== 0) {
      throw new Error(`Could not clone repository:\n${clone.stderr || clone.stdout}`);
    }

    const deployment = await execute('vercel', deployArgs, directory);
    const output = `${deployment.stdout}\n${deployment.stderr}`.trim();
    if (deployment.exitCode !== 0) {
      throw new Error(`Vercel deployment failed:\n${output}`);
    }

    const urls = output.match(/https:\/\/[^\s]+/g) ?? [];
    return { url: urls.at(-1), output };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
