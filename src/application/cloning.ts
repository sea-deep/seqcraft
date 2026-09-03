import { useWorkspaceStore } from '../state/workspace-store';
import { useCloningStore } from '../state/cloning-store';
import { useActivityStore } from '../state/activity-store';
import { planRestrictionClone } from '../scientific/restriction-cloning';
import { findEnzyme } from '../data/restriction-enzymes';
import { generateId } from '../utils/id';
import type { SequenceDocument } from '../domain/document';
import { ScientificSequence } from '../scientific/nucleotide';

export interface PrepareCloneParams {
  vectorDocumentId?: string;
  insertDocumentId: string;
  enzymeNames: string[];
  vectorFragmentId?: string;
  insertFragmentId?: string;
}

export function prepareRestrictionClone(params: PrepareCloneParams) {
  const store = useWorkspaceStore.getState();
  const vectorDocId = params.vectorDocumentId || store.activeDocumentId;
  const vectorDoc = store.documents.find(d => d.id === vectorDocId);
  const insertDoc = store.documents.find(d => d.id === params.insertDocumentId);

  if (!vectorDoc) return { ok: false, error: 'VECTOR_DOCUMENT_NOT_FOUND', details: {} };
  if (!insertDoc) return { ok: false, error: 'INSERT_DOCUMENT_NOT_FOUND', details: {} };

  const enzymes = params.enzymeNames.map(name => findEnzyme(name));
  if (enzymes.some(e => !e)) return { ok: false, error: 'UNKNOWN_ENZYME', details: {} };

  const { proposal, error } = planRestrictionClone({
    vectorDocument: vectorDoc,
    insertDocument: insertDoc,
    enzymes: enzymes as any,
    vectorFragmentId: params.vectorFragmentId,
    insertFragmentId: params.insertFragmentId,
  });

  if (error || !proposal) {
    return { ok: false, error, details: {} };
  }

  useCloningStore.getState().setPendingProposal(proposal);

  return { ok: true, proposal };
}

export function approveRestrictionClone() {
  const cloneStore = useCloningStore.getState();
  const proposal = cloneStore.pendingProposal;
  if (!proposal) return null;

  const candidate = proposal.candidates.find(c => c.id === cloneStore.selectedCandidateId);
  if (!candidate) return null;

  const docId = generateId();
  const recombinantDoc: SequenceDocument = {
    length: candidate.recombinantSequence.length,
    storageMode: "memory",
    id: docId,
    name: `${proposal.vectorDocumentName} - ${proposal.insertDocumentName} Recombinant`,
    topology: proposal.vectorTopology || 'circular',
    sequence: new ScientificSequence(candidate.recombinantSequence, 'DNA'),
    alphabet: 'DNA',
    features: candidate.recombinantFeatures,
    primers: [],
    source: 'cloning_preview',
    version: 1
  };

  const wsStore = useWorkspaceStore.getState();
  wsStore.addDocument(recombinantDoc);
  wsStore.setActiveDocument(docId);
  wsStore.setActiveView('map');
  
  cloneStore.clearPendingProposal();
  
  useActivityStore.getState().addEvent({
    toolName: 'human_approve_restriction_clone',
    status: 'success',
    inputSummary: 'Approved restriction cloning',
    resultSummary: `Created recombinant: ${recombinantDoc.name}`
  });

  return recombinantDoc;
}

export function cancelRestrictionClone() {
  useCloningStore.getState().clearPendingProposal();
  useActivityStore.getState().addEvent({
    toolName: 'human_cancel_restriction_clone',
    status: 'success',
    inputSummary: 'Cancelled restriction cloning',
    resultSummary: 'Proposal cleared'
  });
}
