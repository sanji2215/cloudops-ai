import { describe, it, expect } from 'vitest';
import {
  createAgentState,
  addMessage,
  setPlan,
  getProgressSummary,
  updatePlanStep,
} from '../../src/agent/AgentState.js';
import { formatPlanForDisplay } from '../../src/agent/Planner.js';
import { createSessionMemory, createProjectMemory } from '../../src/memory/index.js';

describe('AgentState', () => {
  it('creates initial state', () => {
    const state = createAgentState('inspect AWS');
    expect(state.status).toBe('idle');
    expect(state.objective).toBe('inspect AWS');
  });

  it('tracks messages and plan progress', () => {
    let state = createAgentState('test');
    state = addMessage(state, { role: 'user', content: 'hello' });
    state = setPlan(state, [
      { id: '1', description: 'Step 1', status: 'completed' },
      { id: '2', description: 'Step 2', status: 'pending' },
    ]);

    const summary = getProgressSummary(state);
    expect(summary).toContain('1/2');
  });

  it('updates plan steps', () => {
    let state = createAgentState('test');
    state = setPlan(state, [{ id: '1', description: 'Step', status: 'pending' }]);
    state = updatePlanStep(state, '1', 'completed');
    expect(state.plan[0]?.status).toBe('completed');
  });
});

describe('Plan formatting', () => {
  it('formats plan for display', () => {
    const formatted = formatPlanForDisplay([
      { id: '1', description: 'Inspect GitHub', status: 'pending' },
      { id: '2', description: 'Check Vercel', status: 'pending' },
    ]);
    expect(formatted).toContain('PLAN');
    expect(formatted).toContain('Inspect GitHub');
  });
});

describe('Memory', () => {
  it('stores and retrieves session memory', async () => {
    const memory = createSessionMemory();
    await memory.set('last_query', 'inspect AWS');
    expect(await memory.get('last_query')).toBe('inspect AWS');
  });

  it('isolates project memory by project ID', async () => {
    const mem1 = createProjectMemory('proj-a');
    const mem2 = createProjectMemory('proj-b');
    await mem1.set('arch', 'microservices');
    expect(await mem2.get('arch')).toBeUndefined();
    expect(await mem1.get('arch')).toBe('microservices');
  });

  it('does not store credentials in memory keys', async () => {
    const memory = createSessionMemory();
    await memory.set('architecture', 'serverless on Vercel');
    const entries = await memory.list();
    expect(entries.every((e) => !e.value.includes('sk-'))).toBe(true);
  });
});
