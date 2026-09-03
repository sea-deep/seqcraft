import { create } from 'zustand';
import type { SequenceTransaction } from '../domain/sequence-transaction';
import { useWorkspaceStore } from './workspace-store';
import { computeSequenceSha256 } from '../utils/sequence-hash';

export type ToolCategory = 'read' | 'navigation' | 'mutation' | 'export';
export type ToolStatus = 'success' | 'error' | 'awaiting_approval' | 'rejected';

export interface ActivityEvent {
  id: string;
  callId: string;
  timestamp: number;
  startedAt: number;
  durationMs: number;
  toolName: string;
  category: ToolCategory;
  status: ToolStatus;
  inputSummary: string;
  resultSummary: string;
  arguments?: Record<string, unknown>;
  structuredResult?: unknown;
  documentId?: string;
  documentRevisionBefore?: number;
  sequenceHashBefore?: string;
  documentRevisionAfter?: number;
  sequenceHashAfter?: string;
  transaction?: SequenceTransaction;
  approvalEvent?: {
    status: 'approved' | 'rejected';
    timestamp: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export type NewActivityEvent = Partial<Omit<ActivityEvent, 'toolName'>> & Pick<ActivityEvent, 'toolName'>;

interface ActivityState {
  events: ActivityEvent[];
  pendingTransaction: SequenceTransaction | null;
  addEvent: (event: NewActivityEvent) => ActivityEvent;
  updateEvent: (callId: string, updates: Partial<ActivityEvent>) => void;
  setPendingTransaction: (tx: SequenceTransaction | null) => void;
  commitPendingTransaction: () => Promise<{ success: boolean; error?: string }>;
  rejectPendingTransaction: () => void;
  clearEvents: () => void;
}

const MAX_EVENTS = 100;

export const useActivityStore = create<ActivityState>((set, get) => ({
  events: [],
  pendingTransaction: null,

  addEvent: (eventInput) => {
    const timestamp = eventInput.timestamp ?? eventInput.startedAt ?? Date.now();
    const newEvent: ActivityEvent = {
      ...eventInput,
      id: eventInput.id || `evt_${Math.random().toString(36).substring(2, 9)}`,
      timestamp,
      startedAt: eventInput.startedAt ?? timestamp,
      durationMs: eventInput.durationMs ?? 0,
      arguments: eventInput.arguments || {},
      category: eventInput.category || 'read',
      status: eventInput.status || 'success',
      inputSummary: eventInput.inputSummary ?? 'Execution',
      resultSummary: eventInput.resultSummary ?? 'Completed',
      callId: eventInput.callId || `call_${Math.random().toString(36).substring(2, 9)}`
    };

    set(state => {
      const nextEvents = [newEvent, ...state.events].slice(0, MAX_EVENTS);
      return { events: nextEvents };
    });

    return newEvent;
  },

  updateEvent: (callId, updates) => {
    set(state => ({
      events: state.events.map(ev => ev.callId === callId ? { ...ev, ...updates } : ev)
    }));
  },

  setPendingTransaction: (tx) => set({ pendingTransaction: tx }),

  commitPendingTransaction: async () => {
    const tx = get().pendingTransaction;
    if (!tx) return { success: false, error: 'No pending transaction' };

    const workspace = useWorkspaceStore.getState();
    const doc = workspace.documents.find(d => d.id === tx.documentId);
    if (!doc || !doc.sequence) {
      return { success: false, error: `Document ${tx.documentId} not found or has no sequence` };
    }

    // Priority 4 — Revision-locked commit
    const currentHash = await computeSequenceSha256(doc.sequence.raw);
    if (doc.version !== tx.baseRevision || currentHash !== tx.baseSequenceHash) {
      const errorMsg = 'Sequence changed after this proposal was analysed.\nRe-analysis required.';
      // Mark transaction as stale
      const updatedTx: SequenceTransaction = { ...tx, status: 'stale' };
      set({ pendingTransaction: updatedTx });
      return { success: false, error: errorMsg };
    }

    // Apply mutation
    workspace.mutateDocumentSequence(tx.documentId, tx.operation);
    const updatedDoc = useWorkspaceStore.getState().documents.find(d => d.id === tx.documentId);
    const revisionAfter = updatedDoc ? updatedDoc.version : tx.baseRevision + 1;
    const hashAfter = updatedDoc?.sequence ? await computeSequenceSha256(updatedDoc.sequence.raw) : tx.expectedSequenceHash;

    const approvedTx: SequenceTransaction = {
      ...tx,
      status: 'applied'
    };

    // Find the corresponding event and update it
    set(state => ({
      pendingTransaction: null,
      events: state.events.map(ev => {
        if (ev.transaction?.id === tx.id || ev.callId === tx.id) {
          return {
            ...ev,
            status: 'success',
            resultSummary: `Mutation applied (v${tx.baseRevision} → v${revisionAfter})`,
            documentRevisionAfter: revisionAfter,
            sequenceHashAfter: hashAfter,
            transaction: approvedTx,
            approvalEvent: {
              status: 'approved',
              timestamp: Date.now()
            }
          };
        }
        return ev;
      })
    }));

    return { success: true };
  },

  rejectPendingTransaction: () => {
    const tx = get().pendingTransaction;
    if (!tx) return;

    const rejectedTx: SequenceTransaction = { ...tx, status: 'rejected' };
    set(state => ({
      pendingTransaction: null,
      events: state.events.map(ev => {
        if (ev.transaction?.id === tx.id || ev.callId === tx.id) {
          return {
            ...ev,
            status: 'rejected',
            resultSummary: 'Sequence transaction rejected by human',
            transaction: rejectedTx,
            approvalEvent: {
              status: 'rejected',
              timestamp: Date.now()
            }
          };
        }
        return ev;
      })
    }));
  },

  clearEvents: () => set({ events: [], pendingTransaction: null })
}));
