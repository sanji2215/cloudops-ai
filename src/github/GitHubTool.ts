import { z } from 'zod';
import type { AgentTool } from '../tools/AgentTool.js';
import type { ToolContext } from '../types/index.js';
import type { CommandExecutor } from '../shell/CommandExecutor.js';
import { createGitHubProvider } from './GitHubProvider.js';

const githubInputSchema = z.object({
  operation: z.enum([
    'list_repos',
    'view_repo',
    'list_prs',
    'list_workflows',
    'view_run',
    'search_code',
    'list_branches',
  ]),
  repo: z.string().optional(),
  query: z.string().optional(),
  run_id: z.string().optional(),
  path: z.string().optional(),
});

export function createGitHubTool(executor: CommandExecutor): AgentTool {
  const provider = createGitHubProvider();

  return {
    name: 'github_inspect',
    description: 'Inspect GitHub repositories, PRs, Actions, and code (read-only)',
    inputSchema: githubInputSchema,
    classification: 'read',
    cloudProvider: 'github',

    async execute(input: z.infer<typeof githubInputSchema>, context: ToolContext) {
      const params: Record<string, string> = {};
      if (input.repo) params['repo'] = input.repo;
      if (input.query) params['query'] = input.query;
      if (input.run_id) params['run_id'] = input.run_id;
      if (input.path) params['path'] = input.path;

      const command = provider.buildCommand(input.operation, params);
      if (!command) throw new Error(`Unknown operation: ${input.operation}`);

      const result = await executor.execute(command, {
        cwd: context.workingDirectory,
        dryRun: context.dryRun,
      });

      return {
        operation: input.operation,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      };
    },
  };
}
