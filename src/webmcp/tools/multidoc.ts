import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { generateId } from '../../utils/id';
import { computeSequenceSha256 } from '../../utils/sequence-hash';
import { getMemorySequence } from '../../utils/document-utils';
import { reverseComplementIupac } from '../../scientific/restriction-analysis';
import { ScientificSequence } from '../../scientific/nucleotide';
import { evaluateTransactionInvariants } from '../../scientific/transaction-invariants';
import type { SequenceDocument } from '../../domain/document';
import type { SequenceTransaction } from '../../domain/sequence-transaction';
import type { SequenceEditAction } from '../../scientific/sequence-editing';

export const seqcraftCopyRegionBetweenDocumentsTool: SeqCraftToolDefinition = {
  name: 'seqcraft_copy_region_between_documents',
  title: 'Copy Region Between Documents',
  description: 'Extract a nucleotide region [sourceStart1, sourceEnd1] from a source construct and stage its insertion into a target construct at targetPosition1. Stages a revision-locked transaction on the target construct.',
  effectClass: 'sequence_mutation',
  inputSchema: {
    type: 'object',
    properties: {
      sourceDocumentId: {
        type: 'string',
        description: 'Source document identifier.'
      },
      sourceStart1: {
        type: 'integer',
        minimum: 1,
        description: '1-based inclusive start position on source document.'
      },
      sourceEnd1: {
        type: 'integer',
        minimum: 1,
        description: '1-based inclusive end position on source document.'
      },
      targetDocumentId: {
        type: 'string',
        description: 'Target document identifier.'
      },
      targetPosition1: {
        type: 'integer',
        minimum: 1,
        description: '1-based insertion point on target document.'
      },
      orientation: {
        type: 'string',
        enum: ['forward', 'reverse_complement'],
        description: 'Orientation of the copied fragment (default: forward).'
      }
    },
    required: ['sourceDocumentId', 'sourceStart1', 'sourceEnd1', 'targetDocumentId', 'targetPosition1'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (
    input: {
      sourceDocumentId: string;
      sourceStart1: number;
      sourceEnd1: number;
      targetDocumentId: string;
      targetPosition1: number;
      orientation?: 'forward' | 'reverse_complement';
    },
    rawCtx
  ) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const srcDoc = ctx.workspace.documents.find(d => d.id === input.sourceDocumentId);
    const tgtDoc = ctx.workspace.documents.find(d => d.id === input.targetDocumentId);

    if (!srcDoc || !tgtDoc) {
      return createError('DOCUMENT_NOT_FOUND', 'Source or target document not found.');
    }

    const srcRaw = srcDoc.sequence ? getMemorySequence(srcDoc).raw : '';
    const s0 = input.sourceStart1 - 1;
    const e0 = input.sourceEnd1;

    let chunk = s0 <= e0 ? srcRaw.slice(s0, e0) : srcRaw.slice(s0) + srcRaw.slice(0, e0);
    if (input.orientation === 'reverse_complement') {
      chunk = reverseComplementIupac(chunk);
    }

    const tgtRaw = tgtDoc.sequence ? getMemorySequence(tgtDoc).raw : '';
    const tgtHash = await computeSequenceSha256(tgtRaw);

    const domainAction: SequenceEditAction = {
      type: 'insert',
      index0: input.targetPosition1 - 1,
      sequence: chunk
    };

    const invariantReport = evaluateTransactionInvariants(tgtDoc, domainAction);
    const txId = `tx_${generateId()}`;

    const tx: SequenceTransaction = {
      id: txId,
      documentId: tgtDoc.id,
      baseRevision: tgtDoc.version,
      baseSequenceHash: tgtHash,
      expectedSequenceHash: '',
      operation: domainAction,
      status: 'pending',
      affectedRange: { start0: input.targetPosition1 - 1, end0Exclusive: input.targetPosition1 - 1 },
      affectedRange1: { start1: input.targetPosition1, end1: input.targetPosition1 },
      beforeFragment: '',
      afterFragment: chunk,
      invariantReport
    };

    ctx.activity.setPendingTransaction(tx);

    return createSuccess({
      status: 'awaiting_approval',
      transactionId: txId,
      targetDocumentId: tgtDoc.id,
      baseRevision: tgtDoc.version,
      baseSequenceHash: tgtHash,
      copiedLengthBp: chunk.length,
      summary: `Insert ${chunk.length} bp from ${srcDoc.name} into ${tgtDoc.name} at pos ${input.targetPosition1}`,
      instruction: 'The insertion has been staged for human review. Call seqcraft_get_transaction_status to track when applied.'
    });
  }
};

export const seqcraftCreateDocumentFromRegionTool: SeqCraftToolDefinition = {
  name: 'seqcraft_create_document_from_region',
  title: 'Create Document From Region',
  description: 'Extract a nucleotide sub-region [start1, end1] from a construct and create a new independent construct in the workspace.',
  effectClass: 'document_metadata',
  inputSchema: {
    type: 'object',
    properties: {
      sourceDocumentId: {
        type: 'string',
        description: 'Source document identifier. If omitted, uses active document.'
      },
      start1: {
        type: 'integer',
        minimum: 1,
        description: '1-based inclusive start coordinate.'
      },
      end1: {
        type: 'integer',
        minimum: 1,
        description: '1-based inclusive end coordinate.'
      },
      name: {
        type: 'string',
        description: 'Name for the new construct.'
      },
      orientation: {
        type: 'string',
        enum: ['forward', 'reverse_complement'],
        description: 'Orientation (default: forward).'
      },
      topology: {
        type: 'string',
        enum: ['linear', 'circular'],
        description: 'Topology of the new document (default: linear).'
      }
    },
    required: ['start1', 'end1', 'name'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (
    input: {
      start1: number;
      end1: number;
      name: string;
      sourceDocumentId?: string;
      orientation?: 'forward' | 'reverse_complement';
      topology?: 'linear' | 'circular';
    },
    rawCtx
  ) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const srcDoc = input.sourceDocumentId
      ? ctx.workspace.documents.find(d => d.id === input.sourceDocumentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!srcDoc) {
      return createError('DOCUMENT_NOT_FOUND', 'Source document not found.');
    }

    const srcRaw = srcDoc.sequence ? getMemorySequence(srcDoc).raw : '';
    const s0 = input.start1 - 1;
    const e0 = input.end1;

    let chunk = s0 <= e0 ? srcRaw.slice(s0, e0) : srcRaw.slice(s0) + srcRaw.slice(0, e0);
    if (input.orientation === 'reverse_complement') {
      chunk = reverseComplementIupac(chunk);
    }

    const docId = generateId();
    const topology = input.topology || 'linear';
    const newDoc: SequenceDocument = {
      id: docId,
      name: input.name.trim(),
      length: chunk.length,
      topology,
      alphabet: srcDoc.alphabet,
      sequence: new ScientificSequence(chunk, srcDoc.alphabet),
      features: [],
      primers: [],
      source: 'raw',
      storageMode: 'memory',
      version: 1
    };

    ctx.workspace.addDocument(newDoc);
    const hash = await computeSequenceSha256(chunk);

    return createSuccess({
      status: 'applied',
      documentId: newDoc.id,
      name: newDoc.name,
      lengthBp: newDoc.length,
      topology: newDoc.topology,
      revision: 1,
      sequenceHash: hash
    });
  }
};

export const multidocTools: SeqCraftToolDefinition[] = [
  seqcraftCopyRegionBetweenDocumentsTool,
  seqcraftCreateDocumentFromRegionTool
];
