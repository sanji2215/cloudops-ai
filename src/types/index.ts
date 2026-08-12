export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export type AgentStatus =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'awaiting_confirmation'
  | 'verifying'
  | 'completed'
  | 'failed';

export type CommandClassification = 'read' | 'write' | 'destructive';

export type RiskLevel = 'low' | 'medium' | 'high';

export type SecurityMode = 'strict' | 'standard' | 'permissive';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  toolName?: string;
}

export interface Observation {
  id: string;
  source: 'tool' | 'model' | 'system';
  content: string;
  timestamp: Date;
}

export interface ToolCallRecord {
  id: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  status: 'pending' | 'approved' | 'denied' | 'executed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface AgentState {
  objective: string;
  messages: Message[];
  plan: PlanStep[];
  observations: Observation[];
  toolCalls: ToolCallRecord[];
  status: AgentStatus;
}

export interface ToolContext {
  sessionId: string;
  dryRun: boolean;
  planMode: boolean;
  workingDirectory: string;
  requestConfirmation: (prompt: ConfirmationPrompt) => Promise<boolean>;
}

export interface ConfirmationPrompt {
  action: string;
  target: string;
  impact: string;
  risk: RiskLevel;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  command: string;
  dryRun: boolean;
}

export interface AuditEvent {
  type:
    | 'user_request'
    | 'model_selected'
    | 'tool_call'
    | 'command'
    | 'confirmation'
    | 'result'
    | 'verification'
    | 'fallback'
    | 'error';
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
