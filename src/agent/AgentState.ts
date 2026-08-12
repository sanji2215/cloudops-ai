import type { AgentState, AgentStatus, Message, PlanStep, Observation } from '../types/index.js';

export function createAgentState(objective: string): AgentState {
  return {
    objective,
    messages: [],
    plan: [],
    observations: [],
    toolCalls: [],
    status: 'idle',
  };
}

export function setAgentStatus(state: AgentState, status: AgentStatus): AgentState {
  return { ...state, status };
}

export function addMessage(state: AgentState, message: Message): AgentState {
  return {
    ...state,
    messages: [...state.messages, message],
  };
}

export function setPlan(state: AgentState, plan: PlanStep[]): AgentState {
  return { ...state, plan };
}

export function addObservation(state: AgentState, observation: Observation): AgentState {
  return {
    ...state,
    observations: [...state.observations, observation],
  };
}

export function updatePlanStep(
  state: AgentState,
  stepId: string,
  status: PlanStep['status'],
): AgentState {
  return {
    ...state,
    plan: state.plan.map((step) => (step.id === stepId ? { ...step, status } : step)),
  };
}

export function getProgressSummary(state: AgentState): string {
  const completed = state.plan.filter((s) => s.status === 'completed').length;
  const total = state.plan.length;
  const toolCount = state.toolCalls.filter((t) => t.status === 'executed').length;

  if (total === 0) {
    return `Status: ${state.status}. Tools executed: ${toolCount}`;
  }

  return `Status: ${state.status}. Plan progress: ${completed}/${total}. Tools executed: ${toolCount}`;
}
