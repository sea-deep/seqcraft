import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { generateId } from '../../utils/id';
import { computeSequenceSha256 } from '../../utils/sequence-hash';
import { getMemorySequence } from '../../utils/document-utils';
import { evaluateTransactionInvariants } from '../../scientific/transaction-invariants';
import { reverseComplementIupac } from '../../scientific/restriction-analysis';
import type { SequenceTransaction } from '../../domain/sequence-transaction';
import type { SequenceEditAction } from '../../scientific/sequence-editing';

export const seqcraftEditSequenceTool: SeqCraftToolDefinition = {
  name: 'seqcraft_edit_sequence',
  title: 'Edit Sequence',
  description: 'Stage an insertion, deletion, or replacement on a DNA/RNA molecule using 1-based closed coordinates. Evaluates biological consequences (CDS frames, amino acid translations, restriction sites) and stages a revision-locked transaction for human review. Does NOT modify the molecule until the human clicks Apply. Follow up with seqcraft_get_transaction_status.',
  effectClass: 'sequence_mutation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Target document ID. If omitted, uses active document.'
      },
      operation: {
        type: 'object',
        description: 'Structured sequence edit operation (insert, delete, or replace).',
        properties: {
          type: {
            type: 'string',
            enum: ['insert', 'delete', 'replace'],
            description: 'Edit operation type.'
          },
          position1: {
            type: 'integer',
            minimum: 1,
            description: '1-based insertion point (for insert operation).'
          },
          start1: {
            type: 'integer',
            minimum: 1,
            description: '1-based start coordinate (for delete or replace operation).'
          },
          end1: {
            type: 'integer',
            minimum: 1,
            description: '1-based end coordinate (for delete or replace operation).'
          },
          sequence: {
            type: 'string',
            description: 'Inserted or replacement sequence string.'
          }
        },
        required: ['type'],
        additionalProperties: false
      },
      range1: {
        type: 'object',
        description: 'Alternative legacy shorthand for replacement [start1, end1].',
        properties: {
          start1: { type: 'integer', minimum: 1 },
          end1: { type: 'integer', minimum: 1 }
        },
        required: ['start1', 'end1'],
        additionalProperties: false
      },
      sequence: {
        type: 'string',
        description: 'Alternative legacy shorthand for replacement sequence.'
      },
      rationale: {
        type: 'string',
        description: 'Biological rationale for the edit.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (
    input: {
      documentId?: string;
      operation?: {
        type: 'insert' | 'delete' | 'replace';
        position1?: number;
        start1?: number;
        end1?: number;
        sequence?: string;
      };
      range1?: { start1: number; end1: number };
      sequence?: string;
      rationale?: string;
    },
    rawCtx
  ) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError(input.documentId ? 'DOCUMENT_NOT_FOUND' : 'NO_ACTIVE_DOCUMENT', 'Target document not found for sequence editing.');
    }

    const rawSeq = doc.sequence ? getMemorySequence(doc).raw : '';
    const baseHash = await computeSequenceSha256(rawSeq);

    // Normalize operation into SequenceEditAction
    let domainAction: SequenceEditAction;
    let affectedStart1 = 1;
    let affectedEnd1 = 1;
    let beforeFrag = '';
    let afterFrag = '';

    const actionType = input.operation?.type || (input as any).actionType || ((input.range1 || (input as any).start1) && input.sequence !== undefined ? 'replace' : undefined);

    if (actionType === 'insert') {
      const pos1 = input.operation?.position1 ?? (input as any).position1 ?? (input.range1?.start1 ?? (input as any).start1 ?? 1);
      const insertSeq = (input.operation?.sequence || input.sequence || '').replace(/\s+/g, '').toUpperCase();
      domainAction = {
        type: 'insert',
        index0: pos1 - 1,
        sequence: insertSeq
      };
      affectedStart1 = pos1;
      affectedEnd1 = pos1;
      beforeFrag = '';
      afterFrag = insertSeq;
    } else if (actionType === 'delete') {
      const s1 = input.operation?.start1 ?? (input.range1?.start1 ?? (input as any).start1 ?? 1);
      const e1 = input.operation?.end1 ?? (input.range1?.end1 ?? (input as any).end1 ?? 1);
      domainAction = {
        type: 'delete',
        start0: s1 - 1,
        end0Exclusive: e1
      };
      affectedStart1 = s1;
      affectedEnd1 = e1;
      beforeFrag = rawSeq.slice(s1 - 1, e1);
      afterFrag = '';
    } else if (actionType === 'replace') {
      const s1 = input.operation?.start1 ?? (input.range1?.start1 ?? (input as any).start1 ?? 1);
      const e1 = input.operation?.end1 ?? (input.range1?.end1 ?? (input as any).end1 ?? 1);
      const replSeq = (input.operation?.sequence || input.sequence || '').replace(/\s+/g, '').toUpperCase();
      domainAction = {
        type: 'replace',
        start0: s1 - 1,
        end0Exclusive: e1,
        replacement: replSeq
      };
      affectedStart1 = s1;
      affectedEnd1 = e1;
      beforeFrag = rawSeq.slice(s1 - 1, e1);
      afterFrag = replSeq;
    } else {
      return createError('INVALID_INPUT', 'Must provide operation { type: "insert" | "delete" | "replace", ... } or range1 + sequence.');
    }

    const invariantReport = evaluateTransactionInvariants(doc, domainAction);
    const txId = `tx_${generateId()}`;

    const tx: SequenceTransaction = {
      id: txId,
      documentId: doc.id,
      baseRevision: doc.version,
      baseSequenceHash: baseHash,
      expectedSequenceHash: '', // Filled upon approval
      operation: domainAction,
      status: 'pending',
      affectedRange: { start0: affectedStart1 - 1, end0Exclusive: affectedEnd1 },
      affectedRange1: { start1: affectedStart1, end1: affectedEnd1 },
      beforeFragment: beforeFrag,
      afterFragment: afterFrag,
      invariantReport
    };

    // Stage transaction in activity store
    ctx.activity.setPendingTransaction(tx);

    return createSuccess({
      status: 'awaiting_approval',
      transactionId: txId,
      documentId: doc.id,
      baseRevision: doc.version,
      baseSequenceHash: baseHash,
      operation: domainAction,
      affectedRange: { start1: affectedStart1, end1: affectedEnd1 },
      invariantReport,
      invariantSummary: invariantReport.summary,
      transaction: tx,
      instruction: 'The edit has been staged for human review. Check transaction status with seqcraft_get_transaction_status before assuming the molecule changed.'
    });
  }
};

export const seqcraftReverseComplementRegionTool: SeqCraftToolDefinition = {
  name: 'seqcraft_reverse_complement_region',
  title: 'Reverse Complement Region',
  description: 'Stage an in-place reverse complement of a sequence region [start1, end1] on the target molecule. Creates a revision-locked transaction for human review.',
  effectClass: 'sequence_mutation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Target document ID. If omitted, uses active document.'
      },
      start1: {
        type: 'integer',
        minimum: 1,
        description: '1-based inclusive start position.'
      },
      end1: {
        type: 'integer',
        minimum: 1,
        description: '1-based inclusive end position.'
      }
    },
    required: ['start1', 'end1'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (input: { start1: number; end1: number; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError(input.documentId ? 'DOCUMENT_NOT_FOUND' : 'NO_ACTIVE_DOCUMENT', 'Document not found.');
    }

    if (ctx.activity.pendingTransaction) {
      return createError('HUMAN_APPROVAL_REQUIRED', 'A sequence transaction is already pending human approval. Commit or reject it before staging another sequence mutation.');
    }

    const rawSeq = doc.sequence ? getMemorySequence(doc).raw : '';
    const baseHash = await computeSequenceSha256(rawSeq);

    const start0 = input.start1 - 1;
    const end0Exclusive = input.end1;
    const originalChunk = rawSeq.slice(start0, end0Exclusive);
    const rcChunk = reverseComplementIupac(originalChunk);

    const domainAction: SequenceEditAction = {
      type: 'reverse_complement',
      start0,
      end0Exclusive
    };

    const invariantReport = evaluateTransactionInvariants(doc, domainAction);
    const txId = `tx_${generateId()}`;

    const tx: SequenceTransaction = {
      id: txId,
      documentId: doc.id,
      baseRevision: doc.version,
      baseSequenceHash: baseHash,
      expectedSequenceHash: '',
      operation: domainAction,
      status: 'pending',
      affectedRange: { start0: input.start1 - 1, end0Exclusive: input.end1 },
      affectedRange1: { start1: input.start1, end1: input.end1 },
      beforeFragment: originalChunk,
      afterFragment: rcChunk,
      invariantReport
    };

    ctx.activity.setPendingTransaction(tx);

    return createSuccess({
      status: 'awaiting_approval',
      transactionId: txId,
      documentId: doc.id,
      baseRevision: doc.version,
      baseSequenceHash: baseHash,
      affectedRange: { start1: input.start1, end1: input.end1 },
      summary: `Reverse complement region ${input.start1}–${input.end1}`,
      instruction: 'Use seqcraft_get_transaction_status to check when approved.'
    });
  }
};

export const seqcraftRotateOriginTool: SeqCraftToolDefinition = {
  name: 'seqcraft_rotate_origin',
  title: 'Rotate Origin',
  description: 'Stage setting a new circular origin (position 1) on a circular plasmid. Re-indexes nucleotide coordinates and feature locations. Requires a circular topology and human review.',
  effectClass: 'sequence_mutation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      },
      newOrigin1: {
        type: 'integer',
        minimum: 1,
        description: '1-based nucleotide position to become the new origin (position 1).'
      },
      rationale: {
        type: 'string',
        description: 'Biological rationale for the edit.'
      }
    },
    required: ['newOrigin1'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (input: { newOrigin1: number; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError(input.documentId ? 'DOCUMENT_NOT_FOUND' : 'NO_ACTIVE_DOCUMENT', 'Target document not found.');
    }

    if (ctx.activity.pendingTransaction) {
      return createError('HUMAN_APPROVAL_REQUIRED', 'A sequence transaction is already pending human approval. Commit or reject it before staging another sequence mutation.');
    }

    if (doc.topology !== 'circular') {
      return createError('CIRCULAR_REQUIRED', `Origin rotation requires a circular document. '${doc.name}' is linear.`, 'Use seqcraft_update_document_metadata to set topology to circular first if intended.');
    }

    if (input.newOrigin1 < 1 || input.newOrigin1 > doc.length) {
      return createError('INVALID_COORDINATE', `newOrigin1 (${input.newOrigin1}) must be between 1 and ${doc.length}.`);
    }

    const rawSeq = doc.sequence ? getMemorySequence(doc).raw : '';
    const baseHash = await computeSequenceSha256(rawSeq);

    const domainAction: SequenceEditAction = {
      type: 'rotate_origin',
      newOrigin0: input.newOrigin1 - 1
    };

    const invariantReport = evaluateTransactionInvariants(doc, domainAction);
    const txId = `tx_${generateId()}`;

    const tx: SequenceTransaction = {
      id: txId,
      documentId: doc.id,
      baseRevision: doc.version,
      baseSequenceHash: baseHash,
      expectedSequenceHash: '',
      operation: domainAction,
      status: 'pending',
      affectedRange: { start0: input.newOrigin1 - 1, end0Exclusive: input.newOrigin1 },
      affectedRange1: { start1: input.newOrigin1, end1: input.newOrigin1 },
      beforeFragment: '',
      afterFragment: '',
      invariantReport
    };

    ctx.activity.setPendingTransaction(tx);

    return createSuccess({
      status: 'awaiting_approval',
      transactionId: txId,
      documentId: doc.id,
      baseRevision: doc.version,
      baseSequenceHash: baseHash,
      newOrigin1: input.newOrigin1,
      summary: `Rotate circular origin to position ${input.newOrigin1}`,
      instruction: 'Use seqcraft_get_transaction_status to track when approved.'
    });
  }
};

export const sequenceTools: SeqCraftToolDefinition[] = [
  seqcraftEditSequenceTool,
  seqcraftReverseComplementRegionTool,
  seqcraftRotateOriginTool
];
