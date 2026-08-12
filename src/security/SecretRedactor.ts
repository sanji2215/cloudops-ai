const SECRET_PATTERNS: RegExp[] = [
  /\b(sk-[a-zA-Z0-9]{20,})\b/g,
  /\b(AKIA[0-9A-Z]{16})\b/g,
  /\b(ghp_[a-zA-Z0-9]{36,})\b/g,
  /\b(gho_[a-zA-Z0-9]{36,})\b/g,
  /\b(github_pat_[a-zA-Z0-9_]{20,})\b/g,
  /\b(xox[baprs]-[a-zA-Z0-9-]{10,})\b/g,
  /\b(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\b/g,
  /(?:api[_-]?key|secret|token|password|passwd|credential)\s*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi,
  /\bBearer\s+[a-zA-Z0-9._-]{20,}\b/g,
];

const REDACTED = '[REDACTED]';

export function redactSecrets(input: string): string {
  let result = input;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, REDACTED);
  }
  return result;
}

export function containsSecret(input: string): boolean {
  return SECRET_PATTERNS.some((pattern) => {
    const testPattern = new RegExp(pattern.source, pattern.flags.replace('g', ''));
    return testPattern.test(input);
  });
}

export function redactObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return redactSecrets(obj) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => redactObject(item)) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('credential')
      ) {
        result[key] = REDACTED;
      } else {
        result[key] = redactObject(value);
      }
    }
    return result as T;
  }
  return obj;
}
