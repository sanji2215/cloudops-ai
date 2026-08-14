# CloudOps AI

CloudOps AI is a TypeScript command-line DevOps agent. Ask it to inspect cloud infrastructure in plain English, build a safe execution plan, run approved CLI commands, and verify the result. It can also publish a Git repository to Vercel with one command.

## What it does

- Routes requests across OpenAI, Anthropic, Gemini, xAI, Groq, Perplexity, or an OpenAI-compatible model.
- Inspects AWS, Cloudflare, Vercel, and GitHub through their official command-line tools.
- Plans work before execution, tracks session/project context, and verifies completed actions.
- Enforces an allowlist, command risk classification, confirmation policies, dry-run mode, audit logging, and secret redaction.
- Deploys a GitHub, GitLab, or Bitbucket repository to Vercel and prints its public URL.

## Architecture

```text
CLI
 └─ AgentService
     └─ Agent: Planner → ModelRouter → Executor → Verifier
         └─ ToolManager → permissions → command validator → command executor
             └─ AWS / Cloudflare / Vercel / GitHub / shell tools
```

The agent core is independent of the CLI, so it can also power the future HTTP API in `src/service/api.ts`.

## Requirements

- Node.js 20 or newer
- At least one AI provider key for natural-language agent commands
- Optional cloud CLIs for the services you want to inspect (`aws`, `gh`, `vercel`, `wrangler`)
- Vercel CLI plus either `vercel login` or `VERCEL_TOKEN` to deploy repositories

## Install

```bash
git clone https://github.com/sanji2215/cloudops-ai.git
cd cloudops-ai
npm install
cp .env.example .env
# Add an AI provider key to .env
npm run build
```

Run interactively:

```bash
npm start
# or, during development
npm run dev
```

## Quick start

```bash
# Ask the AI agent a question
cloudops "inspect my AWS infrastructure"

# Generate a plan before any action
cloudops --plan "diagnose my failing Vercel deployment"

# Simulate mutating actions
cloudops --dry-run "deploy to production"

# Use a particular model
cloudops --provider anthropic --model claude-sonnet-4-20250514 "analyze my cloud architecture"
```

## Deploy a Git repository

Deploy a supported public or authenticated repository to Vercel:

```bash
cloudops deploy https://github.com/owner/repository.git
```

Useful options:

```bash
# Deploy a branch as a preview deployment
cloudops deploy https://github.com/owner/repository.git --branch staging --preview

# Deploy into a specific Vercel project and team
cloudops deploy https://github.com/owner/repository.git --project website --team acme

# Review the exact operation without cloning or deploying
cloudops deploy https://github.com/owner/repository.git --dry-run
```

The command accepts GitHub, GitLab, and Bitbucket HTTPS or SSH URLs. It shallow-clones the selected branch to a temporary directory, runs `vercel deploy`, reports the deployment URL, and removes the temporary clone. Vercel detects common web frameworks automatically.

Authenticate once with `vercel login`, or set a token:

```env
VERCEL_TOKEN=your_vercel_token
```

## Configuration

Settings resolve in this order: CLI flags, environment variables, then `cloudops.config.yaml`.

Configure one or more AI providers in `.env`:

| Provider | Environment variable |
| --- | --- |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Gemini | `GEMINI_API_KEY` |
| xAI | `XAI_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Perplexity | `PERPLEXITY_API_KEY` |
| Compatible API | `CUSTOM_AI_BASE_URL`, `CUSTOM_AI_API_KEY`, `CUSTOM_AI_MODEL` |

Example model routing:

```yaml
routing:
  default:
    provider: groq
    model: openai/gpt-oss-20b
  coding:
    provider: anthropic
  fallback:
    provider: gemini
```

## Tools and safety

| Tool | Purpose | Default mode |
| --- | --- | --- |
| AWS | Account, S3, EC2, Lambda, IAM, VPC inspection | Read-only |
| Cloudflare | Account and zone inspection | Read-only |
| Vercel | Projects, deployments, and domains | Read-only |
| GitHub | Repositories, PRs, Actions, branches, and code | Read-only |
| Shell | Allowlisted cloud/DevOps commands | Controlled |
| Repository deploy | Git clone + Vercel deployment | Write |

Safety controls are enforced outside the AI model:

- Only approved binaries can run.
- Commands are classified as read, write, or destructive.
- Destructive commands and configurable write commands require confirmation.
- `--dry-run` simulates writes.
- Credentials are redacted from logs and AI context.
- Tool calls and commands are audit logged.

## Development

```bash
npm run build       # Compile TypeScript
npm run typecheck   # Type-check without writing output
npm run lint        # Run ESLint
npm test            # Run Vitest tests
npm run check       # Type-check + lint + tests
```

## Project layout

```text
src/
├── agent/       # Planning, execution, and verification loop
├── ai/          # Provider abstraction and model routing
├── cli/         # Commander command-line interface
├── cloud/       # AWS, Cloudflare, and Vercel adapters
├── config/      # Zod-validated settings
├── deploy/      # Git repository → Vercel deployment workflow
├── github/      # GitHub adapter
├── logging/     # Structured and audit logging
├── memory/      # Session and project memory
├── security/    # Secret detection and redaction
├── service/     # Agent service and future API surface
├── shell/       # Command execution and validation
└── tools/       # Registry, permission, and confirmation system
```

## License

MIT
