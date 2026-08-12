import { z } from 'zod';
import type { AgentTool } from '../AgentTool.js';
import type { ToolContext } from '../../types/index.js';
import type { CommandExecutor } from '../../shell/CommandExecutor.js';
import { createCommandValidator } from '../../shell/CommandValidator.js';
import type { CloudOpsConfig } from '../../config/schema.js';

const shellInputSchema = z.object({
  command: z.string().min(1).describe('The shell command to execute'),
  reason: z.string().optional().describe('Why this command is being run'),
});

export type ShellToolInput = z.infer<typeof shellInputSchema>;

export interface ShellToolResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  classification: string;
  dryRun: boolean;
}

export function createShellTool(
  executor: CommandExecutor,
  config: CloudOpsConfig,
): AgentTool<ShellToolInput, ShellToolResult> {
  const validator = createCommandValidator(config.security.blockedCommands);

  return {
    name: 'shell_execute',
    description:
      'Execute an authorized shell command for cloud/DevOps operations. Only allowlisted binaries are permitted.',
    inputSchema: shellInputSchema,
    classification: 'read',

    async execute(input: ShellToolInput, context: ToolContext): Promise<ShellToolResult> {
      const validation = validator.validate(input.command);
      if (!validation.valid) {
        throw new Error(validation.reason ?? 'Command validation failed');
      }

      const classification = validation.classification;
      const result = await executor.execute(input.command, {
        cwd: context.workingDirectory,
        dryRun: context.dryRun && classification !== 'read',
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        classification,
        dryRun: result.dryRun,
      };
    },
  };
}
