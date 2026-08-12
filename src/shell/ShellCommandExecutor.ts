import { spawn } from 'node:child_process';
import type { CommandResult } from '../types/index.js';
import type { CommandExecutor, CommandExecutorOptions } from './CommandExecutor.js';
import { parseCommand } from './CommandExecutor.js';
import { redactSecrets } from '../security/SecretRedactor.js';
import { getLogger } from '../logging/index.js';

export class ShellCommandExecutor implements CommandExecutor {
  async execute(command: string, options: CommandExecutorOptions = {}): Promise<CommandResult> {
    const dryRun = options.dryRun ?? false;
    const start = Date.now();

    if (dryRun) {
      return {
        stdout: `DRY RUN: Would execute: ${command}`,
        stderr: '',
        exitCode: 0,
        durationMs: 0,
        command,
        dryRun: true,
      };
    }

    const { binary, args } = parseCommand(command);
    const logger = getLogger();

    logger.audit({
      type: 'command',
      message: `Executing command: ${binary} [args redacted]`,
      metadata: { binary, dryRun },
    });

    return new Promise((resolve) => {
      const child = spawn(binary, args, {
        cwd: options.cwd ?? process.cwd(),
        env: { ...process.env, ...options.env },
        shell: process.platform === 'win32',
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeout = options.timeoutMs ?? 120_000;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, timeout);

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - start;

        resolve({
          stdout: redactSecrets(stdout),
          stderr: redactSecrets(timedOut ? `${stderr}\nCommand timed out` : stderr),
          exitCode: timedOut ? 124 : (code ?? 1),
          durationMs,
          command,
          dryRun: false,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout: '',
          stderr: redactSecrets(err.message),
          exitCode: 1,
          durationMs: Date.now() - start,
          command,
          dryRun: false,
        });
      });
    });
  }
}

export function createCommandExecutor(): CommandExecutor {
  return new ShellCommandExecutor();
}
