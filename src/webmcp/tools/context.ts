import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { computeSequenceSha256 } from '../../utils/sequence-hash';
import { getMemorySequence } from '../../utils/document-utils';

export const seqcraftGetCapabilitiesTool: SeqCraftToolDefinition = {
  name: 'seqcraft_get_capabilities',
  title: 'Get Capabilities',
  description: 'Discover SeqCraft scientific workflows, coordinate conventions (1-based closed [start1, end1]), privacy boundaries, approval rules, and suggested agent task sequences. Use this when planning a multi-step interaction or deciding which SeqCraft tools to call.',
  effectClass: 'read',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (_input, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    return createSuccess({
      system: 'SeqCraft WebMCP Bio-CAD Workspace',
      version: '2.0.0',
      privacy: {
        rawSequences: 'browser-only',
        persistence: 'in-memory-or-user-export'
      },
      coordinateContract: {
        internalApplicationState: '0-based half-open',
        externalWebMcp: '1-based-closed'
      },
      approval: {
        persistentScientificChanges: 'require human approval via sequence transactions'
      },
      coordinateConventions: {
        indexing: '1-based closed intervals [start1, end1]',
        originPosition: 1,
        circularWrap: 'Supported for origins and split features (where start1 > end1 or origin-spanning)',
        externalInterface: 'All WebMCP inputs and outputs use 1-based closed coordinates.'
      },
      approvalRules: {
        sequenceMutations: 'All sequence-altering operations (insert, delete, replace, reverse-complement in place, origin rotation, candidate application) stage a revision-locked SequenceTransaction returning status awaiting_approval. Mutations require human review and commit.',
        candidateStaging: 'Candidate proposals from restriction analysis or domestication bind to baseRevision and baseSequenceHash. Staging them binds to the exact revision analysed.',
        workspaceNavigation: 'Read, navigation, and view operations apply immediately without modal obstruction.'
      },
      supportedCapabilities: [
        'workspace_inspection',
        'document_lifecycle',
        'sequence_mutation_staging',
        'annotation_crud_and_batch',
        'primer_design_and_pcr_simulation',
        'restriction_and_golden_gate_assembly',
        'domestication_and_candidate_staging',
        'multi_document_alignment_and_copy',
        'history_and_undo_redo',
        'import_and_export_genbank_fasta',
        'crispr_radar_and_mmej',
        'opentrons_python_protocol_generation'
      ]
    });
  }
};

export const seqcraftGetWorkspaceContextTool: SeqCraftToolDefinition = {
  name: 'seqcraft_get_workspace_context',
  title: 'Get Workspace Context',
  description: 'Read the current SeqCraft workspace state, including the active molecule, current selection, selected feature, pending transaction state, active view, and registered tool count. Preferred bootstrap tool for any task involving SeqCraft.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      includeDocumentList: {
        type: 'boolean',
        description: 'Whether to include a list of all open document names, IDs, lengths, and topologies in the workspace.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: async (input: { includeDocumentList?: boolean }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const ws = ctx.workspace;
    const activity = ctx.activity;
    const activeDoc = ws.documents.find(d => d.id === ws.activeDocumentId);

    let activeDocContext: any = null;
    if (activeDoc) {
      const rawSeq = activeDoc.sequence ? getMemorySequence(activeDoc).raw : '';
      const gcCount = (rawSeq.match(/[GCgc]/g) || []).length;
      const gcContent = rawSeq.length > 0 ? Math.round((gcCount / rawSeq.length) * 1000) / 10 : 0;
      const seqHash = rawSeq.length > 0 ? await computeSequenceSha256(rawSeq) : '';

      activeDocContext = {
        id: activeDoc.id,
        name: activeDoc.name,
        topology: activeDoc.topology,
        alphabet: activeDoc.alphabet,
        lengthBp: activeDoc.length,
        gcContent,
        featureCount: activeDoc.features.length,
        primerCount: (activeDoc.primers || []).length,
        revision: activeDoc.version,
        sequenceHash: seqHash
      };
    }

    let selectionContext: any = null;
    if (ws.selection && activeDoc && ws.selection.documentId === activeDoc.id) {
      const start1 = ws.selection.start0 + 1;
      const end1 = ws.selection.end0Exclusive;
      const length = end1 >= start1 ? end1 - start1 + 1 : activeDoc.length - start1 + 1 + end1;
      selectionContext = {
        start1,
        end1,
        length
      };
    }

    let selectedFeatureContext: any = null;
    if (ws.selectedFeatureId && activeDoc) {
      const feat = activeDoc.features.find(f => f.id === ws.selectedFeatureId);
      if (feat) {
        const seg = feat.segments[0];
        selectedFeatureContext = {
          id: feat.id,
          name: feat.name,
          type: feat.type,
          strand: feat.strand === -1 ? '-' : '+',
          start1: seg ? seg.start0 + 1 : undefined,
          end1: seg ? seg.end0Exclusive : undefined
        };
      }
    }

    let pendingTxContext: any = null;
    if (activity.pendingTransaction) {
      const ptx = activity.pendingTransaction;
      pendingTxContext = {
        id: ptx.id,
        documentId: ptx.documentId,
        status: ptx.status === 'pending' ? 'awaiting_approval' : ptx.status,
        baseRevision: ptx.baseRevision,
        baseSequenceHash: ptx.baseSequenceHash,
        summary: ptx.invariantReport?.summary || 'Proposed sequence mutation'
      };
    }

    const docList = input?.includeDocumentList
      ? ws.documents.map(d => ({
          id: d.id,
          name: d.name,
          lengthBp: d.length,
          topology: d.topology,
          revision: d.version,
          isActive: d.id === ws.activeDocumentId
        }))
      : undefined;

    // Use current tools if available in browser
    let registeredToolCount = 0;
    if (typeof document !== 'undefined' && (document as any).modelContext) {
      try {
        const tools = await (document as any).modelContext.getTools();
        registeredToolCount = tools.length;
      } catch {
        registeredToolCount = 0;
      }
    }

    return createSuccess({
      activeDocument: activeDocContext || null,
      workspace: {
        activeView: ws.activeView,
        openDocumentCount: ws.documents.length,
        selectedRange: selectionContext || null,
        selectedFeatureId: ws.selectedFeatureId || null
      },
      selectedFeature: selectedFeatureContext || null,
      pendingTransaction: pendingTxContext || null,
      documents: docList,
      webmcp: {
        registeredToolCount
      }
    });
  }
};

export const seqcraftGetSelectedContextTool: SeqCraftToolDefinition = {
  name: 'seqcraft_get_selected_context',
  title: 'Get Selected Context',
  description: 'Read the currently selected nucleotide sequence slice and overlapping biological features in 1-based closed coordinates. Use this to inspect what the human user or current selection is highlighting without retrieving the entire molecule.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses the currently selected or active construct.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: async (input: { documentId?: string } | undefined, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const ws = ctx.workspace;
    const activeDoc = ws.documents.find(d => d.id === ws.activeDocumentId);
    const selDocId = ws.selection ? ws.selection.documentId : undefined;
    const targetDoc = input?.documentId
      ? ws.documents.find(d => d.id === input.documentId)
      : (selDocId ? ws.documents.find(d => d.id === selDocId) : activeDoc) || activeDoc;

    if (!targetDoc) {
      return createError('NO_ACTIVE_DOCUMENT', 'No active document in workspace', 'Create or open a document before querying selection context.');
    }

    const rawSeq = targetDoc.sequence ? getMemorySequence(targetDoc).raw : '';
    const sel = ws.selection && ws.selection.documentId === targetDoc.id ? ws.selection : null;

    let selectedRange: any = null;
    if (sel) {
      const start1 = sel.start0 + 1;
      const end1 = sel.end0Exclusive;
      let seqSlice = '';
      let len = 0;

      if (sel.end0Exclusive >= sel.start0) {
        seqSlice = rawSeq.slice(sel.start0, sel.end0Exclusive);
        len = sel.end0Exclusive - sel.start0;
      } else {
        seqSlice = rawSeq.slice(sel.start0) + rawSeq.slice(0, sel.end0Exclusive);
        len = targetDoc.length - sel.start0 + sel.end0Exclusive;
      }

      selectedRange = {
        start1,
        end1,
        length: len,
        sequence: seqSlice
      };
    }

    const overlappingFeatures: any[] = [];
    if (sel) {
      for (const feat of targetDoc.features) {
        for (const seg of feat.segments) {
          const segStart1 = seg.start0 + 1;
          const segEnd1 = seg.end0Exclusive;
          const selStart1 = sel.start0 + 1;
          const selEnd1 = sel.end0Exclusive;

          const overlaps = (segStart1 <= selEnd1 && segEnd1 >= selStart1);
          if (overlaps) {
            overlappingFeatures.push({
              id: feat.id,
              name: feat.name,
              type: feat.type,
              strand: feat.strand === -1 ? '-' : '+',
              start1: segStart1,
              end1: segEnd1
            });
            break;
          }
        }
      }
    }

    let selectedFeatureContext: any = null;
    if (ws.selectedFeatureId) {
      const feat = targetDoc.features.find(f => f.id === ws.selectedFeatureId);
      if (feat) {
        const seg = feat.segments[0];
        selectedFeatureContext = {
          id: feat.id,
          name: feat.name,
          type: feat.type,
          strand: feat.strand === -1 ? '-' : '+',
          start1: seg ? seg.start0 + 1 : undefined,
          end1: seg ? seg.end0Exclusive : undefined
        };
      }
    }

    return createSuccess({
      documentId: targetDoc.id,
      documentName: targetDoc.name,
      revision: targetDoc.version,
      selection: selectedRange,
      overlappingFeatures,
      selectedFeature: selectedFeatureContext,
      activeView: ws.activeView
    });
  }
};

export const seqcraftGetDocumentRevisionTool: SeqCraftToolDefinition = {
  name: 'seqcraft_get_document_revision',
  title: 'Get Document Revision',
  description: 'Query the current revision number and canonical SHA-256 sequence hash of a document. Essential for revision-locking proposals, avoiding race conditions, and verifying mutation commits.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, checks the active document.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: async (input: { documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const ws = ctx.workspace;
    const doc = input?.documentId ? ws.documents.find(d => d.id === input.documentId) : ws.documents.find(d => d.id === ws.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', `Document ${input?.documentId || 'active'} not found`, 'Use seqcraft_list_documents to see available document IDs.');
    }

    const rawSeq = doc.sequence ? getMemorySequence(doc).raw : '';
    const hash = await computeSequenceSha256(rawSeq);

    return createSuccess({
      documentId: doc.id,
      documentName: doc.name,
      revision: doc.version,
      sequenceHash: hash,
      lengthBp: doc.length
    });
  }
};

export const seqcraftGetTransactionStatusTool: SeqCraftToolDefinition = {
  name: 'seqcraft_get_transaction_status',
  title: 'Get Transaction Status',
  description: 'Check the lifecycle state (awaiting_approval, applied, rejected, or stale) and provenance of a staged sequence transaction. Call this after staging an edit with seqcraft_edit_sequence or candidate staging tools to check if the human approved the change.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      transactionId: {
        type: 'string',
        description: 'Identifier of the staged transaction to inspect. If omitted, inspects the current pending transaction.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: async (input: { transactionId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const activity = ctx.activity;
    const ws = ctx.workspace;
    const pendingTx = activity.pendingTransaction;

    if (pendingTx && (!input?.transactionId || pendingTx.id === input.transactionId)) {
      const currentDoc = ws.documents.find(d => d.id === pendingTx.documentId);
      let isStale = pendingTx.status === 'stale';
      let staleReason: string | undefined = undefined;

      if (!isStale && currentDoc) {
        if (currentDoc.version !== pendingTx.baseRevision) {
          isStale = true;
          staleReason = `Document revision changed from ${pendingTx.baseRevision} to ${currentDoc.version}`;
        }
      }

      let currentHash = pendingTx.baseSequenceHash;
      if (!isStale && currentDoc?.sequence) {
        currentHash = await computeSequenceSha256(currentDoc.sequence.raw);
        if (currentHash !== pendingTx.baseSequenceHash) {
          isStale = true;
          staleReason = 'Sequence content changed since transaction was created';
        }
      } else if (currentDoc?.sequence) {
        currentHash = await computeSequenceSha256(currentDoc.sequence.raw);
      }

      const status = isStale ? 'stale' : pendingTx.status === 'pending' ? 'awaiting_approval' : pendingTx.status;

      return createSuccess({
        transaction: {
          id: pendingTx.id,
          documentId: pendingTx.documentId,
          status,
          baseRevision: pendingTx.baseRevision,
          currentRevision: currentDoc ? currentDoc.version : pendingTx.baseRevision,
          baseSequenceHash: pendingTx.baseSequenceHash,
          currentSequenceHash: currentHash,
          summary: pendingTx.invariantReport?.summary || 'Proposed sequence modification',
          uiPresented: true,
          staleReason
        }
      });
    }

    // Check recent activity events for completed transaction
    const targetId = input?.transactionId;
    const txEvent = activity.events.find(ev =>
      ev.transaction && (!targetId || ev.transaction.id === targetId || ev.callId === targetId)
    );

    if (txEvent?.transaction) {
      const tx = txEvent.transaction;
      const currentDoc = ws.documents.find(d => d.id === tx.documentId);
      const currentHash = currentDoc?.sequence
        ? await computeSequenceSha256(currentDoc.sequence.raw)
        : (txEvent.sequenceHashAfter ?? tx.baseSequenceHash);

      const status = tx.status === 'applied' ? 'applied' : tx.status === 'rejected' ? 'rejected' : tx.status === 'stale' ? 'stale' : 'applied';

      return createSuccess({
        transaction: {
          id: tx.id,
          documentId: tx.documentId,
          status,
          baseRevision: tx.baseRevision,
          currentRevision: currentDoc ? currentDoc.version : (txEvent.documentRevisionAfter ?? tx.baseRevision),
          baseSequenceHash: tx.baseSequenceHash,
          currentSequenceHash: currentHash,
          summary: txEvent.resultSummary || tx.invariantReport?.summary || 'Completed transaction',
          uiPresented: true,
          appliedRevision: txEvent.documentRevisionAfter,
          appliedSequenceHash: txEvent.sequenceHashAfter,
          staleReason: status === 'stale' ? 'Document or sequence changed' : undefined
        }
      });
    }

    return createSuccess({
      transaction: null
    });
  }
};

export const seqcraftGetPendingTransactionTool: SeqCraftToolDefinition = {
  ...seqcraftGetTransactionStatusTool,
  name: 'seqcraft_get_pending_transaction',
  title: 'Get Pending Transaction'
};

export const contextTools: SeqCraftToolDefinition[] = [
  seqcraftGetCapabilitiesTool,
  seqcraftGetWorkspaceContextTool,
  seqcraftGetSelectedContextTool,
  seqcraftGetDocumentRevisionTool,
  seqcraftGetTransactionStatusTool,
  seqcraftGetPendingTransactionTool
];
