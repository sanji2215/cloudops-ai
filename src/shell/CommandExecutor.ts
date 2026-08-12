import type { CommandClassification, CommandResult } from '../types/index.js';

export interface CommandExecutorOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  dryRun?: boolean;
}

export interface CommandExecutor {
  execute(command: string, options?: CommandExecutorOptions): Promise<CommandResult>;
}

export interface ParsedCommand {
  binary: string;
  args: string[];
  raw: string;
}

export function parseCommand(command: string): ParsedCommand {
  const parts = command.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  const binary = parts[0] ?? '';
  const args = parts.slice(1).map((a) => a.replace(/^["']|["']$/g, ''));
  return { binary, args, raw: command };
}

export type { CommandClassification };
