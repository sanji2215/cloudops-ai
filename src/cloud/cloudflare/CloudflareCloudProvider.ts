import type { CloudProvider, CloudOperation } from '../CloudProvider.js';

const CF_READ_OPERATIONS: CloudOperation[] = [
  { name: 'account_info', command: 'wrangler whoami', description: 'Get Cloudflare account info', classification: 'read' },
  { name: 'list_zones', command: 'wrangler pages project list', description: 'List Pages projects', classification: 'read' },
];

export class CloudflareCloudProvider implements CloudProvider {
  readonly id = 'cloudflare';
  readonly name = 'Cloudflare';

  getReadOperations(): CloudOperation[] {
    return CF_READ_OPERATIONS;
  }

  buildCommand(operation: string): string | null {
    return CF_READ_OPERATIONS.find((o) => o.name === operation)?.command ?? null;
  }
}

export function createCloudflareCloudProvider(): CloudflareCloudProvider {
  return new CloudflareCloudProvider();
}
