import type { CommandClassification } from '../types/index.js';
import { parseCommand } from './CommandExecutor.js';

interface CommandRule {
  pattern: RegExp;
  classification: CommandClassification;
}

const DESTRUCTIVE_PATTERNS: CommandRule[] = [
  { pattern: /\bterminate-instances\b/i, classification: 'destructive' },
  { pattern: /\bdelete-bucket\b/i, classification: 'destructive' },
  { pattern: /\bs3\s+rb\b/i, classification: 'destructive' },
  { pattern: /\bremove\s+--prod\b/i, classification: 'destructive' },
  { pattern: /\bvercel\s+remove\b/i, classification: 'destructive' },
  { pattern: /\bpush\s+--force\b/i, classification: 'destructive' },
  { pattern: /\breset\s+--hard\b/i, classification: 'destructive' },
  { pattern: /\bdrop\s+(database|table|schema)\b/i, classification: 'destructive' },
  { pattern: /\bdelete-stack\b/i, classification: 'destructive' },
  { pattern: /\biam\s+delete\b/i, classification: 'destructive' },
];

const WRITE_PATTERNS: CommandRule[] = [
  { pattern: /\bdeploy\b/i, classification: 'write' },
  { pattern: /\bpush\b/i, classification: 'write' },
  { pattern: /\bcreate\b/i, classification: 'write' },
  { pattern: /\bupdate\b/i, classification: 'write' },
  { pattern: /\bput\b/i, classification: 'write' },
  { pattern: /\bcp\s+/i, classification: 'write' },
  { pattern: /\bmv\s+/i, classification: 'write' },
  { pattern: /\brm\s+/i, classification: 'write' },
  { pattern: /\bapply\b/i, classification: 'write' },
  { pattern: /\bcommit\b/i, classification: 'write' },
  { pattern: /\bupload\b/i, classification: 'write' },
  { pattern: /\bset\b/i, classification: 'write' },
];

const READ_PATTERNS: CommandRule[] = [
  { pattern: /\bls\b/i, classification: 'read' },
  { pattern: /\blist\b/i, classification: 'read' },
  { pattern: /\bdescribe\b/i, classification: 'read' },
  { pattern: /\bget\b/i, classification: 'read' },
  { pattern: /\bshow\b/i, classification: 'read' },
  { pattern: /\binspect\b/i, classification: 'read' },
  { pattern: /\bcat\b/i, classification: 'read' },
  { pattern: /\blog\b/i, classification: 'read' },
  { pattern: /\bstatus\b/i, classification: 'read' },
  { pattern: /\bview\b/i, classification: 'read' },
  { pattern: /\bsearch\b/i, classification: 'read' },
  { pattern: /\bdiff\b/i, classification: 'read' },
];

const ALLOWED_BINARIES = new Set([
  'aws',
  'gh',
  'git',
  'vercel',
  'wrangler',
  'cloudflared',
  'kubectl',
  'terraform',
  'npm',
  'node',
]);

export interface ValidationResult {
  valid: boolean;
  classification: CommandClassification;
  reason?: string;
}

export class CommandValidator {
  constructor(
    private readonly allowedBinaries: Set<string> = ALLOWED_BINARIES,
    private readonly blockedCommands: string[] = [],
  ) {}

  validate(command: string): ValidationResult {
    const trimmed = command.trim();
    if (!trimmed) {
      return { valid: false, classification: 'read', reason: 'Empty command' };
    }

    for (const blocked of this.blockedCommands) {
      if (trimmed.includes(blocked)) {
        return {
          valid: false,
          classification: 'destructive',
          reason: `Command matches blocked pattern: ${blocked}`,
        };
      }
    }

    const { binary } = parseCommand(trimmed);
    const normalizedBinary = binary.replace(/\.(exe|cmd|bat)$/i, '');

    if (!this.allowedBinaries.has(normalizedBinary)) {
      return {
        valid: false,
        classification: 'read',
        reason: `Binary not in allowlist: ${normalizedBinary}`,
      };
    }

    const classification = this.classify(trimmed);

    return { valid: true, classification };
  }

  classify(command: string): CommandClassification {
    for (const rule of DESTRUCTIVE_PATTERNS) {
      if (rule.pattern.test(command)) return 'destructive';
    }
    for (const rule of WRITE_PATTERNS) {
      if (rule.pattern.test(command)) return 'write';
    }
    for (const rule of READ_PATTERNS) {
      if (rule.pattern.test(command)) return 'read';
    }
    return 'write';
  }
}

export function createCommandValidator(blockedCommands: string[] = []): CommandValidator {
  return new CommandValidator(ALLOWED_BINARIES, blockedCommands);
}
