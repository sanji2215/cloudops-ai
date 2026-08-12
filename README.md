# CloudOps AI

AI-powered Cloud/DevOps agent with a provider-agnostic architecture. CloudOps AI understands natural-language requests, plans multi-step workflows, executes authorized cloud CLI operations through a permission system, and verifies results.

## Architecture

```
CLI / Web API (future)
        ↓
  AgentService
        ↓
  Agent (Planner → ModelRouter → Executor → Verifier)
        ↓
  ToolManager → Permission System → Command Validator → Command Executor
        ↓
  Cloud Tools (AWS, Cloudflare, Vercel, GitHub)
```

The agent core is independent of the CLI. The same `AgentService` can power a future web UI via the API layer in `src/service/api.ts`.

## Installation

**Requirements:** Node.js 20+

```bash
git clone <repo-url>
cd cloudops-ai
npm install
cp .env.example .env
# Add at least one AI provider API key to .env
npm run build
```

## Environment Variables

See `.env.example` for all supported variables. Minimum requirement:

```env
OPENAI_API_KEY=sk-...
```

Supported AI providers (configure one or more):

| Provider    | Environment Variable   |
|-------------|------------------------|
| OpenAI      | `OPENAI_API_KEY`       |
| Anthropic   | `ANTHROPIC_API_KEY`    |
| Gemini      | `GEMINI_API_KEY`       |
| xAI Grok    | `XAI_API_KEY`          |
| Perplexity  | `PERPLEXITY_API_KEY`   |
| Custom      | `CUSTOM_AI_BASE_URL`, `CUSTOM_AI_API_KEY`, `CUSTOM_AI_MODEL` |

## CLI Usage

```bash
# Interactive mode
npm start
# or
npx cloudops

# Single prompt
cloudops "inspect my AWS infrastructure"

# Plan before executing
cloudops --plan "diagnose my failing Vercel deployment"

# Dry-run (simulate mutating operations)
cloudops --dry-run "deploy to production"

# Verbose logging
cloudops --verbose "list my GitHub repositories"

# Override provider/model
cloudops --provider anthropic --model claude-sonnet-4-20250514 "analyze my cloud architecture"
```

## Supported Tools

| Tool                 | Description                              | Mode       |
|----------------------|------------------------------------------|------------|
| `aws_inspect`        | AWS account, S3, EC2, Lambda, IAM, VPC   | Read-only  |
| `cloudflare_inspect` | Cloudflare account and zones             | Read-only  |
| `vercel_inspect`     | Vercel projects, deployments, domains    | Read-only  |
| `github_inspect`     | Repos, PRs, Actions, code search         | Read-only  |
| `shell_execute`      | Allowlisted CLI commands with validation | Controlled |

## Configuration

Configuration is loaded from (in order of precedence):

1. CLI flags
2. Environment variables
3. `cloudops.config.yaml` (see included example)

Example routing configuration:

```yaml
routing:
  default:
    provider: openai
    model: gpt-4o-mini
  coding:
    provider: anthropic
  fallback:
    provider: gemini
```

## Security Model

- **Command allowlist:** Only approved binaries (`aws`, `gh`, `git`, `vercel`, `wrangler`, etc.)
- **Command classification:** READ / WRITE / DESTRUCTIVE with independent permission checks
- **Confirmation prompts:** Destructive and configurable write operations require user approval
- **Secret redaction:** API keys, tokens, and credentials are redacted from logs and AI context
- **Dry-run mode:** Mutating operations are simulated, not executed
- **Audit logging:** Tool calls, commands, confirmations, and verifications are logged

The permission system is independent of the AI model. The model cannot bypass safety checks.

## Development

```bash
npm run dev          # Run CLI in dev mode (tsx)
npm run build        # Compile TypeScript
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run lint         # ESLint
npm run format       # Prettier
npm run check        # typecheck + lint + test
```

## Testing

62+ unit tests covering:

- Configuration validation
- AI provider registry and model router with fallback
- Tool registry, permissions, and confirmation
- Command validation and secret redaction
- Cloud provider adapters (mocked execution)
- Agent state and memory
- Security hardening

Tests do not require real API credentials or cloud access.

## Project Structure

```
src/
├── agent/       # Agent loop (Planner, Executor, Verifier)
├── ai/          # Provider abstraction, registry, model router
├── tools/       # Tool system, permissions, confirmation
├── shell/       # Command executor and validator
├── cloud/       # AWS, Cloudflare, Vercel adapters
├── github/      # GitHub adapter
├── memory/      # Session and project memory
├── security/    # Secret redaction
├── config/      # Zod-validated configuration
├── logging/     # Structured logging with audit trail
├── service/     # AgentService + future Web API
└── cli/         # Commander CLI (interface layer only)
```

## Roadmap

- [x] Provider-agnostic AI abstraction with fallback routing
- [x] Tool system with permissions and confirmation
- [x] Read-only cloud inspection tools
- [x] Agent loop with planning and verification
- [x] CLI with interactive mode, dry-run, and plan mode
- [x] Session/project memory abstraction
- [ ] HTTP API server for web UI
- [ ] Controlled write operations (deploy, PR workflow)
- [ ] Persistent memory store
- [ ] Streaming progress in interactive mode
- [ ] Integration tests with real cloud sandboxes

## License

MIT
