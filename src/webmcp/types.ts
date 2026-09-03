import { useWorkspaceStore } from '../state/workspace-store';
import { useActivityStore } from '../state/activity-store';

export type EffectClass =
  | 'read'
  | 'navigation'
  | 'workspace_ephemeral'
  | 'document_metadata'
  | 'annotation_mutation'
  | 'sequence_mutation'
  | 'document_destructive'
  | 'export';

export interface ToolError {
  code: string;
  message: string;
  recovery?: string;
  details?: unknown;
}

export interface ToolSuccess<T = unknown> {
  ok: true;
  isError: false;
  result: T;
}

export interface ToolFailure {
  ok: false;
  isError: true;
  error: ToolError;
  content: Array<{ type: 'text'; text: string }>;
}

export type ToolResponse<T = unknown> = ToolSuccess<T> | ToolFailure;

export interface ToolContext {
  signal?: AbortSignal;
  workspace: ReturnType<typeof useWorkspaceStore.getState>;
  activity: ReturnType<typeof useActivityStore.getState>;
  callTool?: (toolName: string, args: unknown) => Promise<unknown>;
}

export function resolveToolContext(ctx?: Partial<ToolContext>): ToolContext {
  return {
    signal: ctx?.signal,
    workspace: ctx?.workspace || useWorkspaceStore.getState(),
    activity: ctx?.activity || useActivityStore.getState(),
    callTool: ctx?.callTool
  };
}

export interface SeqCraftToolDefinition<TInput = any, TOutput = any> {
  name: `seqcraft_${string}`;
  title: string;
  description: string;
  effectClass: EffectClass;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
  };
  isAvailable?: (ctx: ToolContext) => boolean;
  execute: (input: TInput, ctx?: Partial<ToolContext>) => Promise<TOutput> | TOutput;
}

export function createSuccess<T>(result: T): ToolSuccess<T> {
  return {
    ok: true,
    isError: false,
    result
  };
}

export function createError(code: string, message: string, recovery?: string, details?: unknown): ToolFailure {
  return {
    ok: false,
    isError: true,
    error: {
      code,
      message,
      recovery,
      details
    },
    content: [
      {
        type: 'text',
        text: `Error [${code}]: ${message}${recovery ? `\nRecovery hint: ${recovery}` : ''}`
      }
    ]
  };
}
