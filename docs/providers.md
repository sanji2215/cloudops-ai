# AI Providers

## Supported Providers

| ID           | Name        | SDK / Protocol        | Features                          |
|--------------|-------------|-----------------------|-----------------------------------|
| `openai`     | OpenAI      | openai SDK            | chat, streaming, tools, vision    |
| `anthropic`  | Anthropic   | @anthropic-ai/sdk     | chat, streaming, tools            |
| `gemini`     | Google      | @google/generative-ai | chat, tools, long context         |
| `xai`        | xAI Grok    | OpenAI-compatible     | chat, streaming, tools            |
| `groq`       | Groq        | OpenAI-compatible     | chat, streaming, tools            |
| `perplexity` | Perplexity  | OpenAI-compatible     | chat, research                      |
| `custom`     | Custom      | OpenAI-compatible     | configurable base URL             |

## Configuration

Set the API key environment variable for each provider you want to use. Only configured providers are registered at startup.

To use Grok, create an API key in the xAI console and set it locally (do not commit it):

```env
XAI_API_KEY=xai-...
# Optional: defaults to grok-4.5
XAI_DEFAULT_MODEL=grok-4.5
```

The Grok provider uses xAI's OpenAI-compatible endpoint at `https://api.x.ai/v1`.

To use Groq, create an API key in the Groq console and set it locally (do not commit it):

```env
GROQ_API_KEY=gsk_...
# Optional: defaults to openai/gpt-oss-20b
GROQ_DEFAULT_MODEL=openai/gpt-oss-20b
```

The Groq provider uses Groq's OpenAI-compatible endpoint at `https://api.groq.com/openai/v1`.

## Model Router

The router selects providers based on:

- Task type (`default`, `coding`, `research`, `planning`, `verification`)
- Explicit CLI override (`--provider`, `--model`)
- Provider availability (API key configured)
- Fallback configuration (on failure or unavailability)

Fallback is disabled when the user explicitly selects a provider via CLI.

## OpenAI-Compatible Providers

xAI, Perplexity, and custom providers extend the OpenAI adapter with different base URLs. Provider-specific logic stays inside each adapter.

```env
CUSTOM_AI_BASE_URL=https://my-api.example.com/v1
CUSTOM_AI_API_KEY=...
CUSTOM_AI_MODEL=my-model
```

## Error Handling

Provider errors are classified as retryable (rate limit, timeout, server error) or non-retryable (auth, invalid request). Retryable errors trigger fallback when enabled.
