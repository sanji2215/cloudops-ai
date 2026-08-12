import type { CloudProvider, CloudProviderRegistry } from './CloudProvider.js';

export class DefaultCloudProviderRegistry implements CloudProviderRegistry {
  private readonly providers = new Map<string, CloudProvider>();

  register(provider: CloudProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): CloudProvider | undefined {
    return this.providers.get(id);
  }

  list(): CloudProvider[] {
    return [...this.providers.values()];
  }
}

export function createCloudProviderRegistry(): CloudProviderRegistry {
  return new DefaultCloudProviderRegistry();
}
