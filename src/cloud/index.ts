import type { CloudProviderRegistry as ICloudProviderRegistry } from './CloudProvider.js';
import { createAWSCloudProvider } from './aws/AWSCloudProvider.js';
import { createCloudflareCloudProvider } from './cloudflare/CloudflareCloudProvider.js';
import { createVercelCloudProvider } from './vercel/VercelCloudProvider.js';

export type { CloudProvider, CloudOperation, CloudProviderRegistry } from './CloudProvider.js';
export { createCloudProviderRegistry, DefaultCloudProviderRegistry } from './CloudProviderRegistry.js';
export { createAWSCloudProvider } from './aws/AWSCloudProvider.js';
export { createAWSTool } from './aws/AWSTool.js';
export { createCloudflareCloudProvider } from './cloudflare/CloudflareCloudProvider.js';
export { createCloudflareTool } from './cloudflare/CloudflareTool.js';
export { createVercelCloudProvider } from './vercel/VercelCloudProvider.js';
export { createVercelTool } from './vercel/VercelTool.js';

export function registerDefaultCloudProviders(registry: ICloudProviderRegistry): void {
  registry.register(createAWSCloudProvider());
  registry.register(createCloudflareCloudProvider());
  registry.register(createVercelCloudProvider());
}
