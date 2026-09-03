import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { computeSequenceSha256 } from '../../utils/sequence-hash';
import { getMemorySequence } from '../../utils/document-utils';
import { generateId } from '../../utils/id';
import { evaluateTransactionInvariants } from '../../scientific/transaction-invariants';
import type { SequenceTransaction } from '../../domain/sequence-transaction';
import type { SequenceEditAction } from '../../scientific/sequence-editing';

export const seqcraftGetHistoryTool: SeqCraftToolDefinition = {
  name: 'seqcraft_get_history',
  title: 'Get History',
  description: 'Retrieve the change history log and undo/redo availability for the active or specified construct.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Document not found.');
    }

    const history = (ctx.workspace.historyEntries || []).filter(e => e.documentId === doc.id);
    const canUndo = ctx.workspace.canUndo(doc.id);
    const canRedo = ctx.workspace.canRedo(doc.id);

    return createSuccess({
      documentId: doc.id,
      documentName: doc.name,
      revision: doc.version,
      canUndo,
      canRedo,
      historyEntries: history.map(h => ({
        timestamp: h.timestamp,
        action: h.action,
        summary: h.summary
      }))
    });
  }
};

export const seqcraftUndoTool: SeqCraftToolDefinition = {
  name: 'seqcraft_undo',
  title: 'Undo',
  description: 'Undo the most recent sequence edit on the active or specified construct in SeqCraft history.',
  effectClass: 'sequence_mutation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (input: { documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    if (!ctx.workspace.canUndo(doc.id)) {
      return createError('CANNOT_UNDO', `No undo history available for document '${doc.name}'.`);
    }

    const revBefore = doc.version;
    const rawBefore = doc.sequence ? getMemorySequence(doc).raw : '';
    const hashBefore = await computeSequenceSha256(rawBefore);

    const success = ctx.workspace.undo(doc.id);
    if (!success) {
      return createError('UNDO_FAILED', 'Failed to undo sequence modification.');
    }

    const updatedDoc = ctx.workspace.documents.find(d => d.id === doc.id);
    const rawAfter = updatedDoc?.sequence ? getMemorySequence(updatedDoc).raw : '';
    const hashAfter = await computeSequenceSha256(rawAfter);

    return createSuccess({
      status: 'applied',
      documentId: doc.id,
      name: updatedDoc?.name || doc.name,
      revision: {
        before: revBefore,
        after: updatedDoc?.version || revBefore - 1
      },
      sequenceHash: {
        before: hashBefore,
        after: hashAfter
      },
      lengthBp: updatedDoc?.length || 0
    });
  }
};

export const seqcraftRedoTool: SeqCraftToolDefinition = {
  name: 'seqcraft_redo',
  title: 'Redo',
  description: 'Redo the previously undone sequence edit on the active or specified construct in SeqCraft history.',
  effectClass: 'sequence_mutation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (input: { documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    if (!ctx.workspace.canRedo(doc.id)) {
      return createError('CANNOT_REDO', `No redo history available for document '${doc.name}'.`);
    }

    const revBefore = doc.version;
    const rawBefore = doc.sequence ? getMemorySequence(doc).raw : '';
    const hashBefore = await computeSequenceSha256(rawBefore);

    const success = ctx.workspace.redo(doc.id);
    if (!success) {
      return createError('REDO_FAILED', 'Failed to redo sequence modification.');
    }

    const updatedDoc = ctx.workspace.documents.find(d => d.id === doc.id);
    const rawAfter = updatedDoc?.sequence ? getMemorySequence(updatedDoc).raw : '';
    const hashAfter = await computeSequenceSha256(rawAfter);

    return createSuccess({
      status: 'applied',
      documentId: doc.id,
      name: updatedDoc?.name || doc.name,
      revision: {
        before: revBefore,
        after: updatedDoc?.version || revBefore + 1
      },
      sequenceHash: {
        before: hashBefore,
        after: hashAfter
      },
      lengthBp: updatedDoc?.length || 0
    });
  }
};

export const seqcraftRestoreRevisionTool: SeqCraftToolDefinition = {
  name: 'seqcraft_restore_revision',
  title: 'Restore Revision',
  description: 'Stage restoration of a document to a historical snapshot in the undo stack. Stages a revision-locked transaction.',
  effectClass: 'sequence_mutation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Target document ID.'
      },
      historySnapshotIndex: {
        type: 'integer',
        minimum: 0,
        description: '0-based index in the document undo stack to restore.'
      }
    },
    required: ['documentId', 'historySnapshotIndex'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (input: { documentId: string; historySnapshotIndex: number }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = ctx.workspace.documents.find(d => d.id === input.documentId);
    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const stack = ctx.workspace.undoStack[doc.id] || [];
    if (input.historySnapshotIndex < 0 || input.historySnapshotIndex >= stack.length) {
      return createError('INVALID_SNAPSHOT_INDEX', `Snapshot index ${input.historySnapshotIndex} out of bounds (stack size ${stack.length}).`);
    }

    const targetSnapshot = stack[input.historySnapshotIndex];
    const targetSeq = targetSnapshot.sequence ? getMemorySequence(targetSnapshot).raw : '';
    const currentRaw = doc.sequence ? getMemorySequence(doc).raw : '';
    const currentHash = await computeSequenceSha256(currentRaw);

    const domainAction: SequenceEditAction = {
      type: 'replace',
      start0: 0,
      end0Exclusive: doc.length,
      replacement: targetSeq
    };

    const invariantReport = evaluateTransactionInvariants(doc, domainAction);
    const txId = `tx_${generateId()}`;

    const tx: SequenceTransaction = {
      id: txId,
      documentId: doc.id,
      baseRevision: doc.version,
      baseSequenceHash: currentHash,
      expectedSequenceHash: '',
      operation: domainAction,
      status: 'pending',
      affectedRange: { start0: 0, end0Exclusive: doc.length },
      affectedRange1: { start1: 1, end1: doc.length },
      beforeFragment: `${currentRaw.slice(0, 30)}…`,
      afterFragment: `${targetSeq.slice(0, 30)}…`,
      invariantReport
    };

    ctx.activity.setPendingTransaction(tx);

    return createSuccess({
      status: 'awaiting_approval',
      transactionId: txId,
      documentId: doc.id,
      baseRevision: doc.version,
      baseSequenceHash: currentHash,
      targetSnapshotName: targetSnapshot.name,
      summary: `Restore snapshot from revision v${targetSnapshot.version}`,
      instruction: 'The rollback has been staged for human review. Call seqcraft_get_transaction_status to confirm when applied.'
    });
  }
};

export const historyTools: SeqCraftToolDefinition[] = [
  seqcraftGetHistoryTool,
  seqcraftUndoTool,
  seqcraftRedoTool,
  seqcraftRestoreRevisionTool
];
