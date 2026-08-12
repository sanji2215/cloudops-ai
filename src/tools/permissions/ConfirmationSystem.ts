import * as readline from 'node:readline';
import type { ConfirmationPrompt, RiskLevel } from '../../types/index.js';
import { redactSecrets } from '../../security/SecretRedactor.js';

export type ConfirmationHandler = (prompt: ConfirmationPrompt) => Promise<boolean>;

export class ConfirmationSystem {
  constructor(private readonly handler?: ConfirmationHandler) {}

  async confirm(prompt: ConfirmationPrompt): Promise<boolean> {
    if (this.handler) {
      return this.handler(prompt);
    }
    return this.cliConfirm(prompt);
  }

  private async cliConfirm(prompt: ConfirmationPrompt): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const formatted = formatConfirmationPrompt(prompt);

    return new Promise((resolve) => {
      rl.question(formatted, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }
}

export function formatConfirmationPrompt(prompt: ConfirmationPrompt): string {
  const lines = [
    '',
    'ACTION:',
    redactSecrets(prompt.action),
    '',
    'TARGET:',
    redactSecrets(prompt.target),
    '',
    'IMPACT:',
    redactSecrets(prompt.impact),
    '',
    'RISK:',
    prompt.risk.toUpperCase(),
    '',
    'Proceed? [y/N] ',
  ];
  return lines.join('\n');
}

export function riskFromClassification(
  classification: 'read' | 'write' | 'destructive',
): RiskLevel {
  switch (classification) {
    case 'destructive':
      return 'high';
    case 'write':
      return 'medium';
    default:
      return 'low';
  }
}

export function createConfirmationSystem(handler?: ConfirmationHandler): ConfirmationSystem {
  return new ConfirmationSystem(handler);
}

export function autoApproveConfirmation(): ConfirmationHandler {
  return () => Promise.resolve(true);
}

export function autoDenyConfirmation(): ConfirmationHandler {
  return () => Promise.resolve(false);
}
