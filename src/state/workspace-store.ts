import { create } from 'zustand';
import type { SequenceDocument } from '../domain/document';
import type { Feature } from '../domain/feature';
import type { Primer } from '../domain/primer';
import type { StagedProposal } from '../domain/proposal';
import { validateSelection } from '../domain/coordinates';
import { generateId } from '../utils/id';
import { assertDocumentInvariant } from '../domain/document';

export type WorkspaceView = 'sequence' | 'map' | 'features' | 'primers' | 'enzymes' | 'history' | 'compare';

export interface WorkspaceHistoryEntry {
  id: string;
  documentId: string;
  timestamp: number;
  action: 'created' | 'renamed' | 'metadata' | 'feature' | 'primer' | 'pcr';
  summary: string;
}

interface WorkspaceState {
  activeView: WorkspaceView;
  selectedFeatureId: string | null;
  selectedPrimerId: string | null;
  selectedRestrictionSiteId: string | null;
  documents: SequenceDocument[];
  activeDocumentId: string | null;
  openDocumentIds: string[];
  selection: { documentId: string; start0: number; end0Exclusive: number } | null;
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  stagedProposals: StagedProposal[];
  historyEntries: WorkspaceHistoryEntry[];
  addDocument: (doc: SequenceDocument) => void;
  addDocuments: (docs: SequenceDocument[]) => void;
  setActiveDocument: (id: string) => void;
  closeDocumentTab: (id: string) => void;
  closeAllDocuments: () => void;
  clearWorkspace: () => void;
  setActiveView: (view: WorkspaceView) => void;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  removeDocument: (id: string) => void;
  setSelection: (documentId: string, start0: number, end0Exclusive: number) => void;
  clearSelection: () => void;
  selectFeature: (featureId: string | null) => void;
  selectPrimer: (primerId: string | null) => void;
  selectRestrictionSite: (siteId: string | null) => void;
  selectDocumentFeature: (documentId: string, featureId: string) => void;
  renameDocument: (documentId: string, name: string) => void;
  setDocumentTopology: (documentId: string, topology: SequenceDocument['topology']) => void;
  addFeature: (documentId: string, feature: Feature) => void;
  updateFeature: (documentId: string, feature: Feature) => void;
  deleteFeature: (documentId: string, featureId: string) => void;
  addPrimer: (documentId: string, primer: Primer) => void;
  updatePrimer: (documentId: string, primer: Primer) => void;
  deletePrimer: (documentId: string, primerId: string) => void;
  addHistoryEntry: (entry: Omit<WorkspaceHistoryEntry, 'id' | 'timestamp'>) => void;
  addProposal: (proposal: StagedProposal) => void;
  removeProposal: (id: string) => void;
}

function historyEntry(documentId: string, action: WorkspaceHistoryEntry['action'], summary: string): WorkspaceHistoryEntry {
  return { id: generateId(), documentId, timestamp: Date.now(), action, summary };
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  documents: [], activeDocumentId: null, openDocumentIds: [], activeView: 'sequence', selection: null,
  selectedFeatureId: null, selectedPrimerId: null, selectedRestrictionSiteId: null,
  sidebarOpen: true, inspectorOpen: true, stagedProposals: [], historyEntries: [],

  setSidebarOpen: sidebarOpen => set({ sidebarOpen }),
  setInspectorOpen: inspectorOpen => set({ inspectorOpen }),
  setActiveView: activeView => set({ activeView }),

  addDocument: doc => set(state => {
    assertDocumentInvariant(doc);
    if (state.documents.some(item => item.id === doc.id)) throw new Error(`Document with ID ${doc.id} already exists`);
    return {
      documents: [...state.documents, doc], activeDocumentId: doc.id,
      openDocumentIds: Array.from(new Set([...state.openDocumentIds, doc.id])),
      historyEntries: [historyEntry(doc.id, 'created', `Opened ${doc.name}`), ...(state.historyEntries || [])],
    };
  }),

  addDocuments: docs => set(state => {
    docs.forEach(assertDocumentInvariant);
    const incomingIds = new Set<string>();
    for (const doc of docs) {
      if (incomingIds.has(doc.id) || state.documents.some(item => item.id === doc.id)) throw new Error(`Document with ID ${doc.id} already exists`);
      incomingIds.add(doc.id);
    }
    const newDocs = docs;
    if (newDocs.length === 0) return state;
    const docsToOpen = newDocs.length > 5 ? [newDocs[0].id] : newDocs.map(doc => doc.id);
    return {
      documents: [...state.documents, ...newDocs], activeDocumentId: newDocs[0].id,
      openDocumentIds: Array.from(new Set([...state.openDocumentIds, ...docsToOpen])),
      historyEntries: [...newDocs.map(doc => historyEntry(doc.id, 'created', `Opened ${doc.name}`)), ...(state.historyEntries || [])],
    };
  }),

  setActiveDocument: id => set(state => {
    if (!state.documents.some(doc => doc.id === id)) throw new Error(`Cannot activate unknown document ${id}`);
    const sameDocument = state.activeDocumentId === id;
    return {
      activeDocumentId: id,
      selection: state.selection?.documentId === id ? state.selection : null,
      selectedFeatureId: sameDocument ? state.selectedFeatureId : null,
      selectedPrimerId: sameDocument ? state.selectedPrimerId : null,
      selectedRestrictionSiteId: sameDocument ? state.selectedRestrictionSiteId : null,
      openDocumentIds: Array.from(new Set([...state.openDocumentIds, id])),
    };
  }),

  closeDocumentTab: id => set(state => {
    const openDocumentIds = state.openDocumentIds.filter(documentId => documentId !== id);
    const activeDocumentId = state.activeDocumentId === id ? (openDocumentIds.at(-1) ?? null) : state.activeDocumentId;
    const changedDocument = activeDocumentId !== state.activeDocumentId;
    return {
      openDocumentIds, activeDocumentId,
      selection: changedDocument ? null : state.selection,
      selectedFeatureId: changedDocument ? null : state.selectedFeatureId,
      selectedPrimerId: changedDocument ? null : state.selectedPrimerId,
      selectedRestrictionSiteId: changedDocument ? null : state.selectedRestrictionSiteId,
    };
  }),

  closeAllDocuments: () => set({ openDocumentIds: [], activeDocumentId: null, selection: null, selectedFeatureId: null, selectedPrimerId: null, selectedRestrictionSiteId: null }),
  clearWorkspace: () => set({ documents: [], openDocumentIds: [], activeDocumentId: null, selection: null, selectedFeatureId: null, selectedPrimerId: null, selectedRestrictionSiteId: null, stagedProposals: [], historyEntries: [] }),

  removeDocument: id => set(state => {
    const openDocumentIds = state.openDocumentIds.filter(documentId => documentId !== id);
    const removedActive = state.activeDocumentId === id;
    return {
      documents: state.documents.filter(doc => doc.id !== id), openDocumentIds,
      activeDocumentId: removedActive ? (openDocumentIds.at(-1) ?? null) : state.activeDocumentId,
      selection: state.selection?.documentId === id ? null : state.selection,
      selectedFeatureId: removedActive ? null : state.selectedFeatureId,
      selectedPrimerId: removedActive ? null : state.selectedPrimerId,
      selectedRestrictionSiteId: removedActive ? null : state.selectedRestrictionSiteId,
    };
  }),

  setSelection: (documentId, start0, end0Exclusive) => set(state => {
    const document = state.documents.find(doc => doc.id === documentId);
    if (!document) throw new Error(`Document ${documentId} not found for selection`);
    validateSelection(start0, end0Exclusive, document.length, document.topology);
    return { selection: { documentId, start0, end0Exclusive }, selectedFeatureId: null, selectedPrimerId: null, selectedRestrictionSiteId: null };
  }),

  selectDocumentFeature: (documentId, featureId) => set(state => {
    const document = state.documents.find(doc => doc.id === documentId);
    if (!document) throw new Error(`Document ${documentId} not found`);
    const feature = document.features.find(item => item.id === featureId);
    if (!feature) throw new Error(`Feature ${featureId} not found`);
    const originStart = document.topology === 'circular' ? feature.segments.find(segment => segment.start0 === 0) : undefined;
    const originEnd = document.topology === 'circular' ? feature.segments.find(segment => segment.end0Exclusive === document.length) : undefined;
    const start0 = originStart && originEnd ? originEnd.start0 : Math.min(...feature.segments.map(segment => segment.start0));
    const end0Exclusive = originStart && originEnd ? originStart.end0Exclusive : Math.max(...feature.segments.map(segment => segment.end0Exclusive));
    validateSelection(start0, end0Exclusive, document.length, document.topology);
    return {
      activeDocumentId: documentId, openDocumentIds: Array.from(new Set([...state.openDocumentIds, documentId])),
      selection: { documentId, start0, end0Exclusive }, selectedFeatureId: featureId,
      selectedPrimerId: null, selectedRestrictionSiteId: null,
    };
  }),

  clearSelection: () => set({ selection: null, selectedFeatureId: null, selectedPrimerId: null, selectedRestrictionSiteId: null }),
  selectFeature: selectedFeatureId => set({ selectedFeatureId, selectedPrimerId: null, selectedRestrictionSiteId: null }),
  selectPrimer: selectedPrimerId => set({ selectedPrimerId, selectedFeatureId: null, selectedRestrictionSiteId: null }),
  selectRestrictionSite: selectedRestrictionSiteId => set({ selectedRestrictionSiteId, selectedFeatureId: null, selectedPrimerId: null, selection: null }),

  renameDocument: (documentId, name) => set(state => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Document name cannot be empty');
    const document = state.documents.find(doc => doc.id === documentId);
    if (!document) throw new Error(`Document ${documentId} not found`);
    return {
      documents: state.documents.map(doc => doc.id === documentId ? { ...doc, name: trimmed, version: doc.version + 1 } : doc),
      historyEntries: [historyEntry(documentId, 'renamed', `Renamed ${document.name} to ${trimmed}`), ...(state.historyEntries || [])],
    };
  }),

  setDocumentTopology: (documentId, topology) => set(state => {
    const document = state.documents.find(doc => doc.id === documentId);
    if (!document) throw new Error(`Document ${documentId} not found`);
    if (document.topology === topology) return state;
    return {
      documents: state.documents.map(doc => doc.id === documentId ? { ...doc, topology, version: doc.version + 1 } : doc),
      selection: state.selection?.documentId === documentId ? null : state.selection,
      historyEntries: [historyEntry(documentId, 'metadata', `Changed topology to ${topology}`), ...(state.historyEntries || [])],
    };
  }),

  addFeature: (documentId, feature) => set(state => {
    const document = state.documents.find(doc => doc.id === documentId);
    if (!document) throw new Error(`Document ${documentId} not found`);
    if (document.features.some(item => item.id === feature.id)) throw new Error(`Feature ${feature.id} already exists`);
    return {
      documents: state.documents.map(doc => doc.id === documentId ? { ...doc, features: [...doc.features, feature], version: doc.version + 1 } : doc),
      selectedFeatureId: feature.id, selectedPrimerId: null, selectedRestrictionSiteId: null,
      historyEntries: [historyEntry(documentId, 'feature', `Added feature ${feature.name}`), ...(state.historyEntries || [])],
    };
  }),

  updateFeature: (documentId, feature) => set(state => {
    const document = state.documents.find(doc => doc.id === documentId);
    if (!document?.features.some(item => item.id === feature.id)) throw new Error(`Feature ${feature.id} not found`);
    return {
      documents: state.documents.map(doc => doc.id === documentId ? { ...doc, features: doc.features.map(item => item.id === feature.id ? feature : item), version: doc.version + 1 } : doc),
      selectedFeatureId: feature.id,
      historyEntries: [historyEntry(documentId, 'feature', `Updated feature ${feature.name}`), ...(state.historyEntries || [])],
    };
  }),

  deleteFeature: (documentId, featureId) => set(state => {
    const document = state.documents.find(doc => doc.id === documentId);
    const feature = document?.features.find(item => item.id === featureId);
    if (!document || !feature) throw new Error(`Feature ${featureId} not found`);
    return {
      documents: state.documents.map(doc => doc.id === documentId ? { ...doc, features: doc.features.filter(item => item.id !== featureId), version: doc.version + 1 } : doc),
      selectedFeatureId: state.selectedFeatureId === featureId ? null : state.selectedFeatureId,
      historyEntries: [historyEntry(documentId, 'feature', `Deleted feature ${feature.name}`), ...(state.historyEntries || [])],
    };
  }),

  addPrimer: (documentId, primer) => set(state => {
    const document = state.documents.find(doc => doc.id === documentId);
    if (!document) throw new Error(`Document ${documentId} not found`);
    const primers = document.primers ?? [];
    if (primers.some(item => item.id === primer.id)) throw new Error(`Primer ${primer.id} already exists`);
    return {
      documents: state.documents.map(doc => doc.id === documentId ? { ...doc, primers: [...(doc.primers ?? []), primer], version: doc.version + 1 } : doc),
      selectedPrimerId: primer.id, selectedFeatureId: null, selectedRestrictionSiteId: null,
      historyEntries: [historyEntry(documentId, 'primer', `Added primer ${primer.name}`), ...(state.historyEntries || [])],
    };
  }),

  updatePrimer: (documentId, primer) => set(state => {
    const document = state.documents.find(doc => doc.id === documentId);
    if (!document?.primers?.some(item => item.id === primer.id)) throw new Error(`Primer ${primer.id} not found`);
    return {
      documents: state.documents.map(doc => doc.id === documentId ? { ...doc, primers: doc.primers.map(item => item.id === primer.id ? primer : item), version: doc.version + 1 } : doc),
      selectedPrimerId: primer.id,
      historyEntries: [historyEntry(documentId, 'primer', `Updated primer ${primer.name}`), ...(state.historyEntries || [])],
    };
  }),

  deletePrimer: (documentId, primerId) => set(state => {
    const document = state.documents.find(doc => doc.id === documentId);
    const primer = document?.primers?.find(item => item.id === primerId);
    if (!document || !primer) throw new Error(`Primer ${primerId} not found`);
    return {
      documents: state.documents.map(doc => doc.id === documentId ? { ...doc, primers: doc.primers.filter(item => item.id !== primerId), version: doc.version + 1 } : doc),
      selectedPrimerId: state.selectedPrimerId === primerId ? null : state.selectedPrimerId,
      historyEntries: [historyEntry(documentId, 'primer', `Deleted primer ${primer.name}`), ...(state.historyEntries || [])],
    };
  }),

  addHistoryEntry: entry => set(state => ({ historyEntries: [historyEntry(entry.documentId, entry.action, entry.summary), ...(state.historyEntries || [])] })),
  addProposal: proposal => set(state => ({ stagedProposals: [...(state.stagedProposals || []), proposal] })),
  removeProposal: id => set(state => ({ stagedProposals: (state.stagedProposals || []).filter(proposal => proposal.id !== id) })),
}));
