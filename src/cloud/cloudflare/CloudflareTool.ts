import { z } from 'zod';
import type { AgentTool } from '../../tools/AgentTool.js';
import type { ToolContext } from '../../types/index.js';
import type { CommandExecutor } from '../../shell/CommandExecutor.js';
import { createCloudflareCloudProvider } from './CloudflareCloudProvider.js';

const cfInputSchema = z.object({
  operation: z.enum(['account_info', 'list_zones']),
});

export function createCloudflareTool(executor: CommandExecutor): AgentTool {
  const provider = createCloudflareCloudProvider();

  return {
    name: 'cloudflare_inspect',
    description: 'Inspect Cloudflare account and resources (read-only)',
    inputSchema: cfInputSchema,
    classification: 'read',
    cloudProvider: 'cloudflare',

    async execute(input: z.infer<typeof cfInputSchema>, context: ToolContext) {
      const command = provider.buildCommand(input.operation);
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
