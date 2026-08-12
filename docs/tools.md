# Tools

## Tool Interface

Every tool implements `AgentTool`:

```typescript
interface AgentTool<TInput, TResult> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  classification?: 'read' | 'write' | 'destructive';
  execute(input: TInput, context: ToolContext): Promise<TResult>;
}
```

Tools are registered in `ToolRegistry` and exposed to the AI as function definitions.

## Available Tools

### aws_inspect

Read-only AWS CLI operations:

- `sts_get_caller_identity` — Account identity
- `s3_list_buckets` — List S3 buckets
- `ec2_describe_instances` — EC2 instances
- `lambda_list_functions` — Lambda functions
- `iam_get_account_summary` — IAM summary
- `cloudwatch_describe_alarms` — CloudWatch alarms
- `ec2_describe_vpcs` — VPCs

### vercel_inspect

- `list_projects`, `list_deployments`, `inspect_project`, `list_domains`

### cloudflare_inspect

- `account_info`, `list_zones`

### github_inspect

- `list_repos`, `view_repo`, `list_prs`, `list_workflows`, `view_run`, `search_code`, `list_branches`

### shell_execute

Executes allowlisted shell commands with validation. The AI should prefer dedicated cloud tools over raw shell commands.

## Tool Execution Flow

```
AI tool call → ToolManager → input validation (Zod)
→ PermissionManager → Confirmation (if required)
→ Tool.execute() → CommandExecutor → Result (redacted)
```

## Enabling/Disabling Tools

In `cloudops.config.yaml`:

```yaml
tools:
  shell: true
  aws: true
  cloudflare: true
  vercel: true
  github: true
```
