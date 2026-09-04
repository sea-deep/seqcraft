import type { SeqCraftToolDefinition, ToolContext, ToolResponse } from './types';
import { createError } from './types';
import { useWorkspaceStore } from '../state/workspace-store';
import { useActivityStore } from '../state/activity-store';
import { computeSequenceSha256 } from '../utils/sequence-hash';
import { getMemorySequence } from '../utils/document-utils';
import { generateId } from '../utils/id';

import { contextTools } from './tools/context';
import { workspaceTools } from './tools/workspace';
import { documentTools } from './tools/documents';
import { sequenceTools } from './tools/sequence';
import { featureTools } from './tools/features';
import { primerTools } from './tools/primers';
import { cloningTools } from './tools/cloning';
import { analysisTools } from './tools/analysis';
import { multidocTools } from './tools/multidoc';
import { historyTools } from './tools/history';
import { ioTools } from './tools/io';
import { automationTools } from './tools/automation';
import { databaseTools } from './tools/database';

export const ALL_SEQCRAFT_TOOLS: SeqCraftToolDefinition[] = [
  ...contextTools,
  ...workspaceTools,
  ...documentTools,
  ...sequenceTools,
  ...featureTools,
  ...primerTools,
  ...cloningTools,
  ...analysisTools,
  ...multidocTools,
  ...historyTools,
  ...ioTools,
  ...databaseTools,
  ...automationTools
];

export const TOOL_MAP = new Map<string, SeqCraftToolDefinition>(
  ALL_SEQCRAFT_TOOLS.map(t => [t.name, t])
);

export function getWebMCPContext() {
  if (typeof document !== 'undefined' && (document as any).modelContext) {
    return (document as any).modelContext;
  }
  return null;
}

import { APP_LIMITS } from '../config/app-limits';
import { ERROR_CODES } from '../domain/errors';

function sanitizeArgs(input: any): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string' && v.length > APP_LIMITS.MAX_SANITIZED_ARGUMENT_LENGTH && (k.toLowerCase().includes('sequence') || k.toLowerCase().includes('content') || k.toLowerCase().includes('raw'))) {
      cleaned[k] = `${v.slice(0, 40)}… (${v.length} chars)`;
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

function summarizeInput(_toolName: string, input: any): string {
  if (!input || typeof input !== 'object') return 'Execution';
  if (input.name) return input.name;
  if (input.view) return `View: ${input.view}`;
  if (input.start1 != null && input.end1 != null) return `Range: ${input.start1}–${input.end1}`;
  if (input.enzymeNames) return `Enzymes: ${input.enzymeNames.join(', ')}`;
  if (input.enzymeId) return `Enzyme: ${input.enzymeId}`;
  if (input.action) return `Action: ${input.action}`;
  if (input.format) return `Format: ${input.format}`;
  if (input.mode) return `Mode: ${input.mode}`;
  return 'Parameters';
}

export async function executeToolInternal(
  toolName: string,
  rawInput: unknown,
  signal?: AbortSignal
): Promise<ToolResponse> {
  signal?.throwIfAborted();

  const tool = TOOL_MAP.get(toolName);
  if (!tool) {
    return createError(ERROR_CODES.UNKNOWN_TOOL, `Tool '${toolName}' is not registered in SeqCraft WebMCP.`);
  }

  const callId = `call_${generateId()}`;
  const startedAt = Date.now();

  let parsedInput = rawInput;
  if (typeof rawInput === 'string') {
    try {
      parsedInput = JSON.parse(rawInput);
    } catch {
      // Use raw input if parsing fails
    }
  }

  const ws = useWorkspaceStore.getState();
  const activeDocId = (parsedInput as any)?.documentId || ws.activeDocumentId;
  const targetDoc = activeDocId ? ws.documents.find(d => d.id === activeDocId) : null;
  const revisionBefore = targetDoc?.version;
  const hashBefore = targetDoc?.sequence ? await computeSequenceSha256(getMemorySequence(targetDoc).raw) : undefined;

  const toolCtx: ToolContext = {
    signal,
    workspace: ws,
    activity: useActivityStore.getState(),
    callTool: (name, args) => executeToolInternal(name, args, signal)
  };

  let result: any;
  let status: 'success' | 'error' | 'awaiting_approval' = 'success';
  let resultSummary = 'Completed';

  try {
    result = await tool.execute(parsedInput, toolCtx);
    if (result?.isError || result?.ok === false) {
      status = 'error';
      resultSummary = result.error?.message || 'Failed';
    } else if (result?.result?.status === 'awaiting_approval' || result?.status === 'awaiting_approval') {
      status = 'awaiting_approval';
      resultSummary = 'Awaiting human approval';
    } else {
      status = 'success';
      resultSummary = 'Success';
    }
  } catch (err: any) {
    console.error('[WebMCP Tool Exception]', toolName, err);
    status = 'error';
    result = createError(
      'INTERNAL_ERROR',
      err?.message || 'Tool execution threw an uncaught error',
      'Inspect tool arguments against the published schema using seqcraft_get_capabilities, or verify active workspace state with seqcraft_get_workspace_context.'
    );
    resultSummary = err?.message || 'Error';
  }

  const durationMs = Date.now() - startedAt;

  // Post-execution snapshot
  const postWs = useWorkspaceStore.getState();
  const postDoc = activeDocId ? postWs.documents.find(d => d.id === activeDocId) : null;
  const revisionAfter = postDoc?.version;
  const isMutated = revisionBefore !== undefined && revisionAfter !== undefined && revisionAfter !== revisionBefore;
  const hashAfter = isMutated && postDoc?.sequence ? await computeSequenceSha256(getMemorySequence(postDoc).raw) : undefined;

  const tx = result?.result?.transaction || (status === 'awaiting_approval' ? useActivityStore.getState().pendingTransaction : undefined);

  // Record Agent Run timeline event
  useActivityStore.getState().addEvent({
    callId,
    toolName: tool.name,
    category: tool.effectClass === 'sequence_mutation' || tool.effectClass === 'annotation_mutation' || tool.effectClass === 'document_metadata' ? 'mutation' : tool.effectClass === 'navigation' ? 'navigation' : tool.effectClass === 'export' ? 'export' : 'read',
    startedAt,
    durationMs,
    status,
    inputSummary: summarizeInput(tool.name, parsedInput),
    resultSummary,
    arguments: sanitizeArgs(parsedInput),
    structuredResult: result.ok ? result.result : undefined,
    documentId: activeDocId,
    documentRevisionBefore: revisionBefore,
    sequenceHashBefore: hashBefore,
    documentRevisionAfter: isMutated ? revisionAfter : undefined,
    sequenceHashAfter: hashAfter,
    transaction: tx,
    error: result.isError ? result.error : undefined
  });

  return result;
}

export async function registerSeqCraftTools(targetContext?: any, signal?: AbortSignal): Promise<void> {
  const ctx = targetContext || getWebMCPContext();
  if (!ctx || typeof ctx.registerTool !== 'function') {
    return;
  }

  for (const t of ALL_SEQCRAFT_TOOLS) {
    if (signal?.aborted) return;
    try {
      const isRead = t.effectClass === 'read';
      const annotations = {
        readOnlyHint: t.annotations?.readOnlyHint !== undefined ? t.annotations.readOnlyHint : isRead,
        untrustedContentHint: t.name === 'seqcraft_get_capabilities' ? false : true
      };
      await ctx.registerTool(
        {
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations,
          execute: async (input: unknown) => {
            if (signal?.aborted) {
              return { isError: true, content: [{ type: 'text', text: 'Aborted' }] };
            }
            return await executeToolInternal(t.name, input, signal);
          }
        },
        { signal }
      );
    } catch (err: any) {
      if (err?.name === 'InvalidStateError' || err?.message?.includes('already registered')) {
        continue;
      }
      throw err;
    }
  }
}
