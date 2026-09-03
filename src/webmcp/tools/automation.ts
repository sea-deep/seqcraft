import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { compileOpentronsPCRProtocol, compileOpentronsDigestProtocol } from '../../scientific/opentrons-compiler';

export const seqcraftGenerateOpentronsProtocolTool: SeqCraftToolDefinition = {
  name: 'seqcraft_generate_opentrons_protocol',
  title: 'Generate Opentrons Protocol',
  description: 'Compile a production-ready Python protocol for automated liquid handling on Opentrons OT-2 or Flex robots. Supports PCR master mix distribution and restriction digestion setups.',
  effectClass: 'export',
  inputSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['pcr', 'digest'],
        description: 'Protocol type to generate (pcr or digest).'
      },
      robotModel: {
        type: 'string',
        enum: ['OT-2', 'Flex'],
        description: 'Target Opentrons robot model (default: OT-2).'
      },
      numReactions: {
        type: 'integer',
        minimum: 1,
        maximum: 96,
        description: 'Number of reactions to prepare (1-96).'
      },
      reactionVolumeUl: {
        type: 'number',
        minimum: 5,
        maximum: 100,
        description: 'Total reaction volume in microliters (default: 50).'
      },
      documentId: {
        type: 'string',
        description: 'Target document ID. If omitted, uses active document.'
      },
      forwardPrimer: {
        type: 'string',
        description: 'Forward primer name (for PCR mode).'
      },
      reversePrimer: {
        type: 'string',
        description: 'Reverse primer name (for PCR mode).'
      },
      annealingTempC: {
        type: 'number',
        description: 'PCR annealing temperature in Celsius.'
      },
      ampliconLengthBp: {
        type: 'integer',
        description: 'Expected PCR amplicon length in base pairs.'
      },
      enzymeNames: {
        type: 'array',
        items: { type: 'string' },
        description: 'Restriction enzymes for digestion (for digest mode).'
      },
      incubationTempC: {
        type: 'number',
        description: 'Incubation temperature in Celsius for digest (default: 37).'
      },
      incubationTimeMin: {
        type: 'integer',
        description: 'Incubation duration in minutes (default: 60).'
      }
    },
    required: ['mode'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (
    input: {
      mode: 'pcr' | 'digest';
      robotModel?: 'OT-2' | 'Flex';
      numReactions?: number;
      reactionVolumeUl?: number;
      documentId?: string;
      forwardPrimer?: string;
      reversePrimer?: string;
      annealingTempC?: number;
      ampliconLengthBp?: number;
      enzymeNames?: string[];
      incubationTempC?: number;
      incubationTimeMin?: number;
    },
    rawCtx
  ) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    const docName = doc?.name || 'DNA Construct';
    const numReactions = input.numReactions || (input as any).digestParameters?.numReactions || (input as any).pcrParameters?.numReactions || 8;
    const robotModel = input.robotModel || (input as any).digestParameters?.robotModel || (input as any).pcrParameters?.robotModel || 'OT-2';

    const mode = input.mode || (input as any).reactionType || ((input as any).digestParameters ? 'digest' : (input as any).pcrParameters ? 'pcr' : 'pcr');
    const digestParams = (input as any).digestParameters || {};
    const pcrParams = (input as any).pcrParameters || {};

    if (mode === 'pcr') {
      const fwd = input.forwardPrimer || pcrParams.forwardPrimer || 'Fwd-Primer';
      const rev = input.reversePrimer || pcrParams.reversePrimer || 'Rev-Primer';
      const annTemp = input.annealingTempC || pcrParams.annealingTempC || 58.0;
      const ampLen = input.ampliconLengthBp || pcrParams.ampliconLengthBp || doc?.length || 1000;
      const vol = input.reactionVolumeUl || pcrParams.reactionVolumeUl || 50;

      if (vol > 200 || vol <= 0) {
        return createError('INVALID_VOLUME', `Reaction volume ${vol} µL is invalid (must be between 1 and 200 µL for standard 96-well plates).`, 'Adjust reactionVolumeUl to 200 µL or less.');
      }

      try {
        const res = compileOpentronsPCRProtocol({
          templateDocName: docName,
          forwardPrimerName: fwd,
          reversePrimerName: rev,
          ampliconLengthBp: ampLen,
          annealingTempC: annTemp,
          numReactions,
          reactionVolumeUl: vol,
          robotModel
        });

        return createSuccess({
          filename: res.filename,
          summary: res.summary,
          robotModel,
          reagentPlateMap: res.reagentPlateMap,
          tubeRackMap: res.tubeRackMap,
          billOfMaterials: res.billOfMaterials,
          pythonCode: res.pythonCode
        });
      } catch (err: any) {
        return createError('INVALID_VOLUME', err?.message || 'Failed to compile Opentrons PCR protocol.');
      }
    }

    if (mode === 'digest') {
      const enzymes = (input.enzymeNames && input.enzymeNames.length > 0)
        ? input.enzymeNames
        : (digestParams.enzymeNames && digestParams.enzymeNames.length > 0)
          ? digestParams.enzymeNames
          : ['EcoRI'];
      const incTemp = input.incubationTempC || digestParams.incubationTempC || 37;
      const incTime = input.incubationTimeMin || digestParams.incubationTimeMin || 60;
      const vol = input.reactionVolumeUl || digestParams.reactionVolumeUl || 50;

      if (vol > 200 || vol <= 0) {
        return createError('INVALID_VOLUME', `Reaction volume ${vol} µL is invalid (must be between 1 and 200 µL for standard 96-well plates).`, 'Adjust reactionVolumeUl to 200 µL or less.');
      }

      try {
        const res = compileOpentronsDigestProtocol({
          dnaDocName: docName,
          enzymeNames: enzymes,
          numReactions,
          reactionVolumeUl: vol,
          incubationTempC: incTemp,
          incubationTimeMin: incTime,
          robotModel
        });

        return createSuccess({
          filename: res.filename,
          summary: res.summary,
          robotModel,
          reagentPlateMap: res.reagentPlateMap,
          tubeRackMap: res.tubeRackMap,
          billOfMaterials: res.billOfMaterials,
          pythonCode: res.pythonCode
        });
      } catch (err: any) {
        return createError('INVALID_VOLUME', err?.message || 'Failed to compile Opentrons digest protocol.');
      }
    }

    return createError('INVALID_MODE', `Unknown protocol mode '${mode}'. Must be 'pcr' or 'digest'.`);
  }
};

export const seqcraftExecuteActionsTool: SeqCraftToolDefinition = {
  name: 'seqcraft_execute_actions',
  title: 'Execute Actions',
  description: 'Execute a batch of SeqCraft tool actions in sequential order. Rejects recursion. If any action stages a sequence mutation (status: awaiting_approval) or errors in stop_on_error mode, execution halts immediately without executing subsequent actions.',
  effectClass: 'workspace_ephemeral',
  inputSchema: {
    type: 'object',
    properties: {
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tool: { type: 'string', description: 'Name of the tool to invoke.' },
            arguments: { type: 'object', description: 'Arguments object for the tool.' }
          },
          required: ['tool'],
          additionalProperties: false
        },
        description: 'Ordered list of tool calls to execute.'
      },
      mode: {
        type: 'string',
        enum: ['sequential', 'stop_on_error'],
        description: 'Execution mode (default: stop_on_error).'
      }
    },
    required: ['actions'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (
    input: {
      actions: Array<{ tool: string; arguments?: Record<string, unknown> }>;
      mode?: 'sequential' | 'stop_on_error';
    },
    rawCtx
  ) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    if (!ctx.callTool) {
      return createError('COMPOSITE_RUNNER_UNAVAILABLE', 'Tool invocation context is not configured for composite execution.');
    }

    const results: Array<{
      tool: string;
      status: 'success' | 'error' | 'awaiting_approval';
      result?: unknown;
      error?: unknown;
    }> = [];

    const stopOnError = input.mode !== 'sequential';

    for (const act of input.actions) {
      ctx.signal?.throwIfAborted();

      // Guard: Recursion prevention
      if (act.tool === 'seqcraft_execute_actions') {
        results.push({
          tool: act.tool,
          status: 'error',
          error: 'Recursive invocation of seqcraft_execute_actions is not permitted.'
        });
        if (stopOnError) break;
        continue;
      }

      try {
        const rawRes: any = await ctx.callTool(act.tool, act.arguments || {});
        let res = rawRes;
        if (typeof rawRes === 'string') {
          try { res = JSON.parse(rawRes); } catch { /* raw */ }
        }

        const isAwaitingApproval = res?.result?.status === 'awaiting_approval' || res?.status === 'awaiting_approval';
        const isError = res?.isError || res?.ok === false;

        if (isError) {
          results.push({
            tool: act.tool,
            status: 'error',
            error: res.error || res
          });
          if (stopOnError) break;
        } else if (isAwaitingApproval) {
          results.push({
            tool: act.tool,
            status: 'awaiting_approval',
            result: res.result || res
          });
          // Crucial rule: halt execution on staged transaction
          break;
        } else {
          results.push({
            tool: act.tool,
            status: 'success',
            result: res.result || res
          });
        }
      } catch (err: any) {
        results.push({
          tool: act.tool,
          status: 'error',
          error: err.message || 'Execution failed'
        });
        if (stopOnError) break;
      }
    }

    return createSuccess({
      executedActionsCount: results.length,
      totalRequested: input.actions.length,
      completedAll: results.length === input.actions.length && results.every(r => r.status === 'success'),
      results
    });
  }
};

export const automationTools: SeqCraftToolDefinition[] = [
  seqcraftGenerateOpentronsProtocolTool,
  seqcraftExecuteActionsTool
];
