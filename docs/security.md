# Security

## Threat Model

CloudOps AI executes shell commands on the user's machine with the user's cloud credentials. The primary risks are:

1. AI suggesting or executing destructive commands
2. Secrets leaking into logs or AI context
3. Unauthorized write operations
4. Model bypassing safety checks via prompt injection

## Mitigations

### Command Allowlist

Only these binaries can be executed: `aws`, `gh`, `git`, `vercel`, `wrangler`, `cloudflared`, `kubectl`, `terraform`, `npm`, `node`.

### Command Classification

| Class        | Examples                        | Policy                          |
|--------------|---------------------------------|---------------------------------|
| READ         | `aws s3 ls`, `gh repo list`     | Auto-approved                   |
| WRITE        | `vercel deploy`, `git push`     | Confirmation (configurable)     |
| DESTRUCTIVE  | `terminate-instances`, `--force`| Always requires confirmation    |

Classification is pattern-based in `CommandValidator`, independent of the AI model.

### Security Modes

| Mode         | Read | Write | Destructive     |
|--------------|------|-------|-----------------|
| `strict`     | ✓    | ✗     | Confirmation    |
| `standard`   | ✓    | Config| Confirmation    |
| `permissive` | ✓    | ✓     | Configurable    |

### Secret Redaction

The following are redacted before logging or returning to the AI:

- OpenAI-style keys (`sk-...`)
- AWS access keys (`AKIA...`)
- GitHub tokens (`ghp_...`, `github_pat_...`)
- JWT tokens
- Key/value patterns (`api_key=...`, `Bearer ...`)

### Confirmation System

Confirmation prompts are rendered by the CLI, not the model:

```
ACTION: Execute tool: aws_inspect
TARGET: {"operation":"ec2_describe_instances"}
IMPACT: This is a read operation...
RISK: LOW
Proceed? [y/N]
```

### Audit Trail

These events are logged at INFO level:

- User requests
- Model selection and fallback
- Tool calls
- Command execution (binary only, args redacted)
- Confirmations
- Results and verifications

### Dry-Run Mode

`--dry-run` prevents mutating operations from executing. The agent receives simulated output describing what would happen.

## Assumptions

- Cloud CLI tools (`aws`, `gh`, etc.) are installed and authenticated on the host
- CloudOps does not store or manage cloud credentials
- The user is responsible for their `.env` file permissions
