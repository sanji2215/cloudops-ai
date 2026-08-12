# Development Guide

## Prerequisites

- Node.js 20+
- npm
- Cloud CLI tools for manual testing (optional)

## Setup

```bash
npm install
cp .env.example .env
npm run build
npm test
```

## Scripts

| Script            | Description                    |
|-------------------|--------------------------------|
| `npm run build`   | Compile TypeScript to `dist/`  |
| `npm run dev`     | Run CLI with tsx               |
| `npm test`        | Run Vitest unit tests          |
| `npm run lint`    | ESLint check                   |
| `npm run format`  | Prettier format                |
| `npm run check`   | Full CI check                  |

## Development Phases

The project was built incrementally:

1. Foundation (config, logging, types)
2. AI abstraction (providers, registry)
3. Model router (selection, fallback)
4. Tool system (registry, permissions, confirmation)
5. Shell execution (executor, validator, redaction)
6. AWS read-only tools
7. Cloudflare, Vercel, GitHub adapters
8. Agent loop (planner, executor, verifier)
9. CLI polish (interactive, flags)
10. Memory (session, project)
11. Security hardening tests
12. Web API stub

## Adding Tests

Tests live in `tests/` organized by phase. Use mocks for external providers and command execution:

```typescript
const mockExecutor: CommandExecutor = {
  execute: vi.fn().mockResolvedValue({ stdout: '...', exitCode: 0, ... }),
};
```

## Code Style

- Strict TypeScript (`strict: true`)
- ESLint with `typescript-eslint` strict type-checked rules
- Prettier for formatting
- Interfaces for external integrations
- Zod for runtime validation

## Architecture Rules

1. Agent core must not import from `cli/`
2. Individual AI providers must not be imported by `agent/`
3. The model never executes shell commands directly
4. No credentials in code, logs, or tests
5. No fake cloud responses — use mocks in tests

## Future Web API

Use `createWebAPI()` from `src/service/api.ts` for programmatic access:

```typescript
import { createWebAPI } from './service/api.js';

const api = createWebAPI();
const response = await api.handleRequest({
  objective: 'inspect my AWS account',
  options: { dryRun: false },
});
```

HTTP server implementation is deferred until the CLI agent is stable.
