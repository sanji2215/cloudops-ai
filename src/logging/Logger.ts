import type { AuditEvent, LogLevel } from '../types/index.js';
import { LOG_LEVELS } from '../types/index.js';
import { redactSecrets } from '../security/SecretRedactor.js';

export interface LoggerOptions {
  level?: LogLevel;
  name?: string;
  auditHandler?: (event: AuditEvent) => void;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  name?: string;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private level: LogLevel;
  private readonly name?: string;
  private readonly auditHandler?: (event: AuditEvent) => void;
  private readonly entries: LogEntry[] = [];

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info';
    this.name = options.name;
    this.auditHandler = options.auditHandler;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  getEntries(): readonly LogEntry[] {
    return this.entries;
  }

  child(name: string): Logger {
    return new Logger({
      level: this.level,
      name: this.name ? `${this.name}:${name}` : name,
      auditHandler: this.auditHandler,
    });
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  private write(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const safeMessage = redactSecrets(message);
    const safeMetadata = metadata
      ? (JSON.parse(redactSecrets(JSON.stringify(metadata))) as Record<string, unknown>)
      : undefined;

    const entry: LogEntry = {
      level,
      message: safeMessage,
      timestamp: new Date(),
      ...(this.name !== undefined ? { name: this.name } : {}),
      ...(safeMetadata !== undefined ? { metadata: safeMetadata } : {}),
    };

    this.entries.push(entry);

    if (!this.shouldLog(level)) return;

    const prefix = this.name ? `[${this.name}] ` : '';
    const line = `${entry.timestamp.toISOString()} ${level.toUpperCase()} ${prefix}${safeMessage}`;

    switch (level) {
      case 'error':
        console.error(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      case 'debug':
        console.debug(line);
        break;
      default:
        console.log(line);
    }
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.write('error', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.write('warn', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.write('info', message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.write('debug', message, metadata);
  }

  audit(event: Omit<AuditEvent, 'timestamp'>): void {
    const fullEvent: AuditEvent = { ...event, timestamp: new Date() };
    const safeMessage = redactSecrets(fullEvent.message);
    this.auditHandler?.({ ...fullEvent, message: safeMessage });
    this.info(`AUDIT: ${safeMessage}`, fullEvent.metadata);
  }
}

let rootLogger: Logger | undefined;

export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options);
}

export function getLogger(): Logger {
  rootLogger ??= createLogger({ name: 'cloudops' });
  return rootLogger;
}

export function initLogger(options: LoggerOptions): Logger {
  rootLogger = createLogger(options);
  return rootLogger;
}
