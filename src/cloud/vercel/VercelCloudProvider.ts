import type { CloudProvider, CloudOperation } from '../CloudProvider.js';

const VERCEL_READ_OPERATIONS: CloudOperation[] = [
  { name: 'list_projects', command: 'vercel ls', description: 'List Vercel projects', classification: 'read' },
  { name: 'list_deployments', command: 'vercel ls --meta', description: 'List deployments', classification: 'read' },
  { name: 'inspect_project', command: 'vercel inspect', description: 'Inspect a project/deployment', classification: 'read' },
  { name: 'list_domains', command: 'vercel domains ls', description: 'List domains', classification: 'read' },
];

export class VercelCloudProvider implements CloudProvider {
  readonly id = 'vercel';
  readonly name = 'Vercel';

  getReadOperations(): CloudOperation[] {
    return VERCEL_READ_OPERATIONS;
  }

  buildCommand(operation: string, params?: Record<string, string>): string | null {
    const op = VERCEL_READ_OPERATIONS.find((o) => o.name === operation);
    if (!op) return null;

    let command = op.command;
    if (params?.['project']) {
      command += ` ${params['project']}`;
    }
    if (params?.['deployment']) {
      command += ` ${params['deployment']}`;
    }
    return command;
  }
}

export function createVercelCloudProvider(): VercelCloudProvider {
  return new VercelCloudProvider();
}
