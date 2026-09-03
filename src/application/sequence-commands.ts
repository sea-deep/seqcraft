/**
 * Application commands for staging and executing sequence mutations.
 * Serves as the single domain operation layer for both UI and WebMCP.
 */

import { useWorkspaceStore } from '../state/workspace-store';
import { useActivityStore } from '../state/activity-store';
import { getMemorySequence } from '../utils/document-utils';
import { computeSequenceSha256 } from '../utils/sequence-hash';
import { generateId } from '../utils/id';
import { reverseComplementIupac } from '../scientific/restriction-analysis';
import { evaluateTransactionInvariants } from '../scientific/transaction-invariants';
import type { SequenceEditAction } from '../scientific/sequence-editing';
import type { SequenceTransaction } from '../domain/sequence-transaction';
import { ERROR_CODES } from '../domain/errors';

export interface StageSequenceEditInput {
  documentId?: string;
  action: 'insert' | 'delete' | 'replace';
  position1?: number;
  start1?: number;
  end1?: number;
  sequence?: string;
  expectedSequenceHash?: string;
}

export interface StageCommandResult {
  ok: boolean;
  transactionId?: string;
  transaction?: SequenceTransaction;
  error?: string;
  code?: string;
}

export async function stageSequenceEditCommand(input: StageSequenceEditInput): Promise<StageCommandResult> {
  const store = useWorkspaceStore.getState();
  const activity = useActivityStore.getState();

  const doc = input.documentId
    ? store.documents.find(d => d.id === input.documentId)
    : store.documents.find(d => d.id === store.activeDocumentId);

  if (!doc) {
    return { ok: false, error: 'Target document not found.', code: ERROR_CODES.DOCUMENT_NOT_FOUND };
  }

  const raw = doc.sequence ? getMemorySequence(doc).raw : '';
  const baseHash = await computeSequenceSha256(raw);

  let domainAction: SequenceEditAction;
  let affectedStart1 = 1;
  let affectedEnd1 = doc.length;
  let beforeFrag = '';
  let afterFrag = '';

  if (input.action === 'insert') {
    const pos1 = input.position1 ?? 1;
    const insert0 = Math.max(0, Math.min(doc.length, pos1 - 1));
    const insertSeq = (input.sequence || '').toUpperCase().trim();
    domainAction = { type: 'insert', index0: insert0, sequence: insertSeq };
    affectedStart1 = pos1;
    affectedEnd1 = pos1;
    beforeFrag = '';
    afterFrag = insertSeq;
  } else if (input.action === 'delete') {
    const s1 = input.start1 ?? 1;
    const e1 = input.end1 ?? doc.length;
    const delStart0 = Math.max(0, s1 - 1);
    const delEnd0 = Math.min(doc.length, e1);
    domainAction = { type: 'delete', start0: delStart0, end0Exclusive: delEnd0 };
    affectedStart1 = s1;
    affectedEnd1 = e1;
    beforeFrag = raw.slice(delStart0, delEnd0);
    afterFrag = '';
  } else {
    const s1 = input.start1 ?? 1;
    const e1 = input.end1 ?? doc.length;
    const repStart0 = Math.max(0, s1 - 1);
    const repEnd0 = Math.min(doc.length, e1);
    const repSeq = (input.sequence || '').toUpperCase().trim();
    domainAction = { type: 'replace', start0: repStart0, end0Exclusive: repEnd0, replacement: repSeq };
    affectedStart1 = s1;
    affectedEnd1 = e1;
    beforeFrag = raw.slice(repStart0, repEnd0);
    afterFrag = repSeq;
  }

  const invariantReport = evaluateTransactionInvariants(doc, domainAction);
  const txId = `tx_${generateId()}`;

  const tx: SequenceTransaction = {
    id: txId,
    documentId: doc.id,
    baseRevision: doc.version,
    baseSequenceHash: baseHash,
    expectedSequenceHash: input.expectedSequenceHash || '',
    operation: domainAction,
    status: 'pending',
    affectedRange: { start0: affectedStart1 - 1, end0Exclusive: affectedEnd1 },
    affectedRange1: { start1: affectedStart1, end1: affectedEnd1 },
    beforeFragment: beforeFrag,
    afterFragment: afterFrag,
    invariantReport
  };

  activity.setPendingTransaction(tx);
  return { ok: true, transactionId: txId, transaction: tx };
}

export async function stageReverseComplementCommand(input: { documentId?: string; start1: number; end1: number }): Promise<StageCommandResult> {
  const store = useWorkspaceStore.getState();
  const activity = useActivityStore.getState();

  const doc = input.documentId
    ? store.documents.find(d => d.id === input.documentId)
    : store.documents.find(d => d.id === store.activeDocumentId);

  if (!doc) {
    return { ok: false, error: 'Target document not found.', code: ERROR_CODES.DOCUMENT_NOT_FOUND };
  }

  const raw = doc.sequence ? getMemorySequence(doc).raw : '';
  const baseHash = await computeSequenceSha256(raw);

  const s0 = Math.max(0, input.start1 - 1);
  const e0 = Math.min(doc.length, input.end1);
  const originalChunk = raw.slice(s0, e0);
  const rcChunk = reverseComplementIupac(originalChunk);

  const domainAction: SequenceEditAction = {
    type: 'replace',
    start0: s0,
    end0Exclusive: e0,
    replacement: rcChunk
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

  activity.setPendingTransaction(tx);
  return { ok: true, transactionId: txId, transaction: tx };
}

export async function stageRotateOriginCommand(input: { documentId?: string; newOrigin1: number }): Promise<StageCommandResult> {
  const store = useWorkspaceStore.getState();
  const activity = useActivityStore.getState();

  const doc = input.documentId
    ? store.documents.find(d => d.id === input.documentId)
    : store.documents.find(d => d.id === store.activeDocumentId);

  if (!doc) {
    return { ok: false, error: 'Target document not found.', code: ERROR_CODES.DOCUMENT_NOT_FOUND };
  }

  if (doc.topology !== 'circular') {
    return { ok: false, error: 'Cannot rotate origin on a linear sequence.', code: ERROR_CODES.INVALID_TOPOLOGY };
  }

  const raw = doc.sequence ? getMemorySequence(doc).raw : '';
  const baseHash = await computeSequenceSha256(raw);

  const newOrigin0 = input.newOrigin1 - 1;
  const rotated = raw.slice(newOrigin0) + raw.slice(0, newOrigin0);

  const domainAction: SequenceEditAction = {
    type: 'replace',
    start0: 0,
    end0Exclusive: doc.length,
    replacement: rotated
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

  activity.setPendingTransaction(tx);
  return { ok: true, transactionId: txId, transaction: tx };
}
