import type { Message } from '../types/index.js';

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryProvider {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<MemoryEntry[]>;
  clear(): Promise<void>;
}

export class SessionMemory implements MemoryProvider {
  private readonly store = new Map<string, MemoryEntry>();

  async get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.store.get(key)?.value);
  }

  async set(key: string, value: string): Promise<void> {
    const existing = this.store.get(key);
    const now = new Date();
    this.store.set(key, {
      id: existing?.id ?? `mem_${Date.now()}`,
      key,
      value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await Promise.resolve();
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    await Promise.resolve();
  }

  async list(prefix?: string): Promise<MemoryEntry[]> {
    const entries = [...this.store.values()];
    if (!prefix) return Promise.resolve(entries);
    return Promise.resolve(entries.filter((e) => e.key.startsWith(prefix)));
  }

  async clear(): Promise<void> {
    this.store.clear();
    await Promise.resolve();
  }

  addMessage(messages: Message[], message: Message): Message[] {
    return [...messages, message];
  }
}

export class ProjectMemory implements MemoryProvider {
  private readonly store = new Map<string, MemoryEntry>();
  private readonly projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  getProjectId(): string {
    return this.projectId;
  }

  async get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.store.get(`${this.projectId}:${key}`)?.value);
  }

  async set(key: string, value: string): Promise<void> {
    const fullKey = `${this.projectId}:${key}`;
    const existing = this.store.get(fullKey);
    const now = new Date();
    this.store.set(fullKey, {
      id: existing?.id ?? `proj_${Date.now()}`,
      key: fullKey,
      value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await Promise.resolve();
  }

  async delete(key: string): Promise<void> {
    this.store.delete(`${this.projectId}:${key}`);
    await Promise.resolve();
  }

  async list(prefix?: string): Promise<MemoryEntry[]> {
    const projectPrefix = `${this.projectId}:`;
    const entries = [...this.store.values()].filter((e) => e.key.startsWith(projectPrefix));
    if (!prefix) return Promise.resolve(entries);
    return Promise.resolve(entries.filter((e) => e.key.startsWith(`${projectPrefix}${prefix}`)));
  }

  async clear(): Promise<void> {
    const projectPrefix = `${this.projectId}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(projectPrefix)) {
        this.store.delete(key);
      }
    }
    await Promise.resolve();
  }
}

export function createSessionMemory(): SessionMemory {
  return new SessionMemory();
}

export function createProjectMemory(projectId: string): ProjectMemory {
  return new ProjectMemory(projectId);
}
