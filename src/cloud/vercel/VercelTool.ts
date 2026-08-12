import { z } from 'zod';
import type { AgentTool } from '../../tools/AgentTool.js';
import type { ToolContext } from '../../types/index.js';
import type { CommandExecutor } from '../../shell/CommandExecutor.js';
import { createVercelCloudProvider } from './VercelCloudProvider.js';

const vercelInputSchema = z.object({
  operation: z.enum(['list_projects', 'list_deployments', 'inspect_project', 'list_domains']),
  project: z.string().optional(),
  deployment: z.string().optional(),
});

export function createVercelTool(executor: CommandExecutor): AgentTool {
  const provider = createVercelCloudProvider();

  return {
    name: 'vercel_inspect',
    description: 'Inspect Vercel projects, deployments, and domains (read-only)',
    inputSchema: vercelInputSchema,
    classification: 'read',
    cloudProvider: 'vercel',

    async execute(input: z.infer<typeof vercelInputSchema>, context: ToolContext) {
      const params: Record<string, string> = {};
      if (input.project) params['project'] = input.project;
      if (input.deployment) params['deployment'] = input.deployment;

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
