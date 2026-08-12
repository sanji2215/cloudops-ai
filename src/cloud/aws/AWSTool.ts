import { z } from 'zod';
import type { AgentTool } from '../../tools/AgentTool.js';
import type { ToolContext } from '../../types/index.js';
import type { CommandExecutor } from '../../shell/CommandExecutor.js';
import { createAWSCloudProvider } from './AWSCloudProvider.js';

const awsInputSchema = z.object({
  operation: z.enum([
    'sts_get_caller_identity',
    's3_list_buckets',
    'ec2_describe_instances',
    'lambda_list_functions',
    'iam_get_account_summary',
    'cloudwatch_describe_alarms',
    'ec2_describe_vpcs',
  ]),
  parameters: z.record(z.string()).optional(),
});

export type AWSToolInput = z.infer<typeof awsInputSchema>;

export function createAWSTool(executor: CommandExecutor): AgentTool<AWSToolInput> {
  const provider = createAWSCloudProvider();

  return {
    name: 'aws_inspect',
    description: `Inspect AWS infrastructure (read-only). Operations: ${provider.getReadOperations().map((o) => o.name).join(', ')}`,
    inputSchema: awsInputSchema,
    classification: 'read',
    cloudProvider: 'aws',

    async execute(input: AWSToolInput, context: ToolContext) {
      const command = provider.buildCommand(input.operation, input.parameters);
      if (!command) throw new Error(`Unknown AWS operation: ${input.operation}`);

      const result = await executor.execute(command, {
        cwd: context.workingDirectory,
        dryRun: context.dryRun,
      });

      return {
        operation: input.operation,
        command,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
      };
    },
  };
}
