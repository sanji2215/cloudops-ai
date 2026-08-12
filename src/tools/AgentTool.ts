import { z } from 'zod';
import type { ToolContext } from '../types/index.js';
import type { ToolDefinition } from '../ai/types.js';

export interface AgentTool<TInput = unknown, TResult = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  classification?: 'read' | 'write' | 'destructive';
  cloudProvider?: string;

  execute(input: TInput, context: ToolContext): Promise<TResult>;
}

export function toolToDefinition(tool: AgentTool): ToolDefinition {
  const jsonSchema = zodToJsonSchema(tool.inputSchema);
  return {
    name: tool.name,
    description: tool.description,
    parameters: jsonSchema,
  };
}

function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodTypeToJson(value);
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }
  return { type: 'object', properties: {} };
}

function zodTypeToJson(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodString) return { type: 'string', ...(schema.description ? { description: schema.description } : {}) };
  if (schema instanceof z.ZodNumber) return { type: 'number' };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodOptional) return zodTypeToJson(schema.unwrap() as z.ZodType);
  if (schema instanceof z.ZodArray) return { type: 'array', items: zodTypeToJson(schema.element as z.ZodType) };
  if (schema instanceof z.ZodEnum) return { type: 'string', enum: schema.options };
  return { type: 'string' };
}
