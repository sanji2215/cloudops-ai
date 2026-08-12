export interface CloudOperation {
  name: string;
  command: string;
  description: string;
  classification: 'read' | 'write' | 'destructive';
}

export interface CloudProvider {
  readonly id: string;
  readonly name: string;
  getReadOperations(): CloudOperation[];
  buildCommand(operation: string, params?: Record<string, string>): string | null;
}

export interface CloudProviderRegistry {
  register(provider: CloudProvider): void;
  get(id: string): CloudProvider | undefined;
  list(): CloudProvider[];
}
