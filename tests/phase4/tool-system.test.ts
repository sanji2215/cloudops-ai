import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createToolRegistry, createToolManager, createToolPermissionManager, autoApproveConfirmation, autoDenyConfirmation, createConfirmationSystem } from '../../src/tools/index.js';
import type { AgentTool } from '../../src/tools/AgentTool.js';
import type { ToolContext } from '../../src/types/index.js';
import type { CloudOpsConfig } from '../../src/config/schema.js';

const baseConfig = (): CloudOpsConfig => ({
  logLevel: 'info',
  routing: { default: { provider: 'openai' } },
  providers: {},
  tools: { shell: true, aws: true, cloudflare: true, vercel: true, github: true },
  security: { mode: 'standard', confirmDestructive: true, confirmWrite: true, allowedReadCommands: [], blockedCommands: [] },
  agent: { maxIterations: 20, maxToolCallsPerIteration: 5 },
  fallbackEnabled: true,
});

const mockContext: ToolContext = {
  sessionId: 'test',
  dryRun: false,
  planMode: false,
  workingDirectory: process.cwd(),
  requestConfirmation: () => Promise.resolve(true),
};

function createMockTool(classification: 'read' | 'write' | 'destructive' = 'read'): AgentTool<{ value: string }, { result: string }> {
  return {
    name: 'mock_tool',
    description: 'A mock tool',
    inputSchema: z.object({ value: z.string() }),
    classification,
    execute: (input) => Promise.resolve({ result: input.value }),
  };
}

describe('ToolRegistry', () => {
  it('registers and lists tools', () => {
    const registry = createToolRegistry();
    registry.register(createMockTool());
    expect(registry.has('mock_tool')).toBe(true);
    expect(registry.getDefinitions()).toHaveLength(1);
  });

  it('throws on duplicate registration', () => {
    const registry = createToolRegistry();
    registry.register(createMockTool());
    expect(() => registry.register(createMockTool())).toThrow('already registered');
  });
});

describe('ToolPermissionManager', () => {
  it('allows read operations', () => {
    const pm = createToolPermissionManager(baseConfig());
    const decision = pm.evaluate('read', 'test', false);
    expect(decision.allowed).toBe(true);
    expect(decision.requiresConfirmation).toBe(false);
  });

  it('requires confirmation for write in standard mode', () => {
    const pm = createToolPermissionManager(baseConfig());
    const decision = pm.evaluate('write', 'test', false);
    expect(decision.allowed).toBe(true);
    expect(decision.requiresConfirmation).toBe(true);
  });

  it('blocks write in strict mode', () => {
    const config = baseConfig();
    config.security.mode = 'strict';
    const pm = createToolPermissionManager(config);
    const decision = pm.evaluate('write', 'test', false);
    expect(decision.allowed).toBe(false);
  });

  it('allows dry-run for write operations', () => {
    const pm = createToolPermissionManager(baseConfig());
    const decision = pm.evaluate('write', 'test', true);
    expect(decision.allowed).toBe(true);
    expect(decision.requiresConfirmation).toBe(false);
  });
});

describe('ToolManager', () => {
  it('executes read tool successfully', async () => {
    const registry = createToolRegistry();
    registry.register(createMockTool('read'));
    const manager = createToolManager(
      registry,
      createToolPermissionManager(baseConfig()),
      createConfirmationSystem(autoApproveConfirmation()),
    );

    const result = await manager.execute('mock_tool', { value: 'hello' }, mockContext);
    expect(result.success).toBe(true);
    expect(result.record.status).toBe('executed');
  });

  it('denies when confirmation rejected', async () => {
    const registry = createToolRegistry();
    registry.register(createMockTool('destructive'));
    const manager = createToolManager(
      registry,
      createToolPermissionManager(baseConfig()),
      createConfirmationSystem(autoDenyConfirmation()),
    );

    const result = await manager.execute('mock_tool', { value: 'hello' }, {
      ...mockContext,
      requestConfirmation: () => Promise.resolve(false),
    });
    expect(result.success).toBe(false);
    expect(result.record.status).toBe('denied');
  });

  it('simulates dry-run for write tools', async () => {
    const registry = createToolRegistry();
    registry.register(createMockTool('write'));
    const manager = createToolManager(
      registry,
      createToolPermissionManager(baseConfig()),
      createConfirmationSystem(autoApproveConfirmation()),
    );

    const result = await manager.execute('mock_tool', { value: 'hello' }, { ...mockContext, dryRun: true });
    expect(result.success).toBe(true);
    expect(result.dryRunMessage).toContain('DRY RUN');
  });
});

describe('ConfirmationSystem', () => {
  it('uses custom handler', async () => {
    const handler = vi.fn().mockResolvedValue(true);
    const system = createConfirmationSystem(handler);
    const result = await system.confirm({
      action: 'test',
      target: 'target',
      impact: 'impact',
      risk: 'low',
    });
    expect(result).toBe(true);
    expect(handler).toHaveBeenCalled();
  });
});
