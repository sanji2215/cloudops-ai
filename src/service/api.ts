/**
 * Future Web API layer stub.
 * Exposes the same AgentService core to a future web UI without CLI dependencies.
 *
 * Usage (future):
 *   import { createWebAPIServer } from 'cloudops-ai/service/api';
 *   const server = createWebAPIServer({ port: 3000 });
 *   await server.start();
 */

import type { AgentService, AgentServiceOptions } from './AgentService.js';
import { createAgentService } from './AgentService.js';
import type { AgentOptions, AgentResult } from '../agent/index.js';

export interface WebAPIRequest {
  objective: string;
  options?: AgentOptions;
}

export interface WebAPIResponse {
  success: boolean;
  result?: AgentResult;
  error?: string;
}

export interface WebAPIServer {
  handleRequest(request: WebAPIRequest): Promise<WebAPIResponse>;
}

export class AgentWebAPI implements WebAPIServer {
  private readonly service: AgentService;

  constructor(options: AgentServiceOptions = {}) {
    this.service = createAgentService(options);
  }

  async handleRequest(request: WebAPIRequest): Promise<WebAPIResponse> {
    try {
      const result = await this.service.run(request.objective, request.options);
      return { success: true, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }
}

export function createWebAPI(options: AgentServiceOptions = {}): WebAPIServer {
  return new AgentWebAPI(options);
}

// Future: HTTP server wrapper using Express/Fastify/Hono
export interface HTTPServerOptions extends AgentServiceOptions {
  port?: number;
  host?: string;
}

export function createWebAPIServer(_options: HTTPServerOptions = {}): {
  start: () => Promise<void>;
  stop: () => Promise<void>;
} {
  return {
    async start() {
      await Promise.resolve();
      throw new Error(
        'HTTP server not yet implemented. Use createWebAPI() for programmatic access.',
      );
    },
    async stop() {
      await Promise.resolve();
    },
  };
}
