import type { CloudOperation } from '../cloud/CloudProvider.js';

export interface GitHubProvider {
  readonly id: string;
  readonly name: string;
  getReadOperations(): CloudOperation[];
  buildCommand(operation: string, params?: Record<string, string>): string | null;
}

const GH_READ_OPERATIONS: CloudOperation[] = [
  { name: 'list_repos', command: 'gh repo list', description: 'List repositories', classification: 'read' },
  { name: 'view_repo', command: 'gh repo view', description: 'View repository details', classification: 'read' },
  { name: 'list_prs', command: 'gh pr list', description: 'List pull requests', classification: 'read' },
  { name: 'list_workflows', command: 'gh workflow list', description: 'List GitHub Actions workflows', classification: 'read' },
  { name: 'view_run', command: 'gh run view', description: 'View workflow run', classification: 'read' },
  { name: 'search_code', command: 'gh search code', description: 'Search code', classification: 'read' },
  { name: 'list_branches', command: 'gh api repos/{owner}/{repo}/branches', description: 'List branches', classification: 'read' },
];

export class DefaultGitHubProvider implements GitHubProvider {
  readonly id = 'github';
  readonly name = 'GitHub';

  getReadOperations(): CloudOperation[] {
    return GH_READ_OPERATIONS;
  }

  buildCommand(operation: string, params?: Record<string, string>): string | null {
    const op = GH_READ_OPERATIONS.find((o) => o.name === operation);
    if (!op) return null;

    let command = op.command;
    if (params?.['repo']) command += ` ${params['repo']}`;
    if (params?.['query']) command += ` ${params['query']}`;
    if (params?.['run_id']) command += ` ${params['run_id']}`;
    if (params?.['path']) command += ` -- ${params['path']}`;
    return command;
  }
}

export function createGitHubProvider(): GitHubProvider {
  return new DefaultGitHubProvider();
}
