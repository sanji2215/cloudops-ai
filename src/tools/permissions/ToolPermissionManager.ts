import type { CommandClassification } from '../../types/index.js';
import type { CloudOpsConfig } from '../../config/schema.js';

export interface PermissionDecision {
  allowed: boolean;
  requiresConfirmation: boolean;
  classification: CommandClassification;
  reason?: string;
}

export class ToolPermissionManager {
  constructor(private readonly config: CloudOpsConfig) {}

  evaluate(
    classification: CommandClassification,
    toolName: string,
    dryRun: boolean,
  ): PermissionDecision {
    const security = this.config.security;

    if (dryRun && classification !== 'read') {
      return {
        allowed: true,
        requiresConfirmation: false,
        classification,
        reason: 'Dry-run mode: action will be simulated',
      };
    }

    if (classification === 'read') {
      return { allowed: true, requiresConfirmation: false, classification };
    }

    if (classification === 'write') {
      if (security.mode === 'strict') {
        return {
          allowed: false,
          requiresConfirmation: false,
          classification,
          reason: `Write operation blocked in strict mode: ${toolName}`,
        };
      }

      const requiresConfirmation = security.confirmWrite;

      return { allowed: true, requiresConfirmation, classification };
    }

    // destructive
    if (security.mode === 'permissive' && !security.confirmDestructive) {
      return { allowed: true, requiresConfirmation: false, classification };
    }

    return {
      allowed: true,
      requiresConfirmation: security.confirmDestructive,
      classification,
    };
  }

  isCommandBlocked(command: string): boolean {
    const blocked = this.config.security.blockedCommands;
    return blocked.some((pattern) => command.includes(pattern));
  }
}

export function createToolPermissionManager(config: CloudOpsConfig): ToolPermissionManager {
  return new ToolPermissionManager(config);
}
