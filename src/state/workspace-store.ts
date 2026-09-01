import { create } from 'zustand'
import type { SequenceDocument } from '../domain/document'
import type { StagedProposal } from '../domain/proposal'
import { validateSelection } from '../domain/coordinates'

export type WorkspaceView = "sequence" | "map" | "features" | "primers" | "enzymes" | "history" | "compare";

interface WorkspaceState {
  activeView: WorkspaceView;
  selectedFeatureId: string | null;
  selectedRestrictionSiteId: string | null;
  documents: SequenceDocument[];
  activeDocumentId: string | null;
  openDocumentIds: string[];
  selection: {
    documentId: string;
    start0: number;
    end0Exclusive: number;
  } | null;
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  stagedProposals: StagedProposal[];
  
  // Actions
  addDocument: (doc: SequenceDocument) => void;
  addDocuments: (docs: SequenceDocument[]) => void;
  setActiveDocument: (id: string) => void;
  closeDocumentTab: (id: string) => void;
  closeAllDocuments: () => void;
  setActiveView: (view: WorkspaceView) => void;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  removeDocument: (id: string) => void;
  setSelection: (documentId: string, start0: number, end0Exclusive: number) => void;
  clearSelection: () => void;
  selectFeature: (featureId: string | null) => void;
  selectRestrictionSite: (siteId: string | null) => void;
  selectDocumentFeature: (documentId: string, featureId: string) => void;
  addProposal: (proposal: StagedProposal) => void;
  removeProposal: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  documents: [],
  activeDocumentId: null,
  openDocumentIds: [],
  activeView: "sequence",
  selection: null,
  selectedFeatureId: null,
  selectedRestrictionSiteId: null,
  sidebarOpen: true,
  inspectorOpen: true,
  stagedProposals: [],

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),

  addDocument: (doc) => set((state) => {
    if (state.documents.some(d => d.id === doc.id)) {
      throw new Error(`Document with ID ${doc.id} already exists`);
    }
    return { 
      documents: [...state.documents, doc],
      activeDocumentId: doc.id,
      openDocumentIds: Array.from(new Set([...state.openDocumentIds, doc.id]))
    };
  }),

  addDocuments: (docs) => set((state) => {
    const newDocs = docs.filter(doc => !state.documents.some(d => d.id === doc.id));
    if (newDocs.length === 0) return state;
    
    // Only automatically open the first document if they import multiple,
    // to avoid tab overflow and lag when importing multi-FASTA files
    const docsToOpen = newDocs.length > 5 ? [newDocs[0].id] : newDocs.map(d => d.id);
    
    return {
      documents: [...state.documents, ...newDocs],
      activeDocumentId: newDocs[0].id,
      openDocumentIds: Array.from(new Set([...state.openDocumentIds, ...docsToOpen]))
    };
  }),

  setActiveView: (view) => set({ activeView: view }),

  setActiveDocument: (id) => set((state) => {
    if (!state.documents.some(d => d.id === id)) {
      throw new Error(`Cannot activate unknown document ${id}`);
    }
    const nextSelection = state.selection?.documentId === id ? state.selection : null;
    const nextSelectedFeatureId = state.activeDocumentId === id ? state.selectedFeatureId : null;
    return { 
      activeDocumentId: id, 
      selection: nextSelection, 
      selectedFeatureId: nextSelectedFeatureId,
      openDocumentIds: Array.from(new Set([...state.openDocumentIds, id]))
    };
  }),

  closeDocumentTab: (id) => set((state) => {
    const newOpen = state.openDocumentIds.filter(docId => docId !== id);
    let newActive = state.activeDocumentId;
    
    // If we closed the active tab, switch to the last available tab
    if (newActive === id) {
      newActive = newOpen.length > 0 ? newOpen[newOpen.length - 1] : null;
    }
    
    return {
      openDocumentIds: newOpen,
      activeDocumentId: newActive
    };
  }),

  closeAllDocuments: () => set({
    openDocumentIds: [],
    activeDocumentId: null
  }),

  removeDocument: (id) => set((state) => {
    const nextDocuments = state.documents.filter(d => d.id !== id);
    const nextOpen = state.openDocumentIds.filter(tid => tid !== id);
    const nextActiveId = state.activeDocumentId === id 
      ? (nextOpen.length > 0 ? nextOpen[nextOpen.length - 1] : null) 
      : state.activeDocumentId;
    
    const nextSelection = state.selection?.documentId === id ? null : state.selection;
    
    return { 
      documents: nextDocuments,
      activeDocumentId: nextActiveId,
      openDocumentIds: nextOpen,
      selection: nextSelection
    };
  }),
  
  setSelection: (documentId, start0, end0Exclusive) => set((state) => {
    const doc = state.documents.find(d => d.id === documentId);
    if (!doc) throw new Error(`Document ${documentId} not found for selection`);
    
    validateSelection(start0, end0Exclusive, doc.sequence.length, doc.topology);
    
    return { 
      selection: { documentId, start0, end0Exclusive },
      selectedFeatureId: null,
      selectedRestrictionSiteId: null
    };
  }),
  
  selectDocumentFeature: (documentId, featureId) => set((state) => {
    const doc = state.documents.find(d => d.id === documentId);
    if (!doc) throw new Error(`Document ${documentId} not found`);
    
    const feature = doc.features.find(f => f.id === featureId);
    if (!feature) throw new Error(`Feature ${featureId} not found`);
    
    const minStart = Math.min(...feature.segments.map(s => s.start0));
    const maxEnd = Math.max(...feature.segments.map(s => s.end0Exclusive));
    
    validateSelection(minStart, maxEnd, doc.sequence.length, doc.topology);
    
    return {
      activeDocumentId: documentId,
      selection: { documentId, start0: minStart, end0Exclusive: maxEnd },
      selectedFeatureId: featureId,
      selectedRestrictionSiteId: null
    };
  }),
  
  clearSelection: () => set({ selection: null, selectedFeatureId: null, selectedRestrictionSiteId: null }),
  selectFeature: (id) => set({ selectedFeatureId: id, selectedRestrictionSiteId: null }),
  selectRestrictionSite: (id) => set({ selectedRestrictionSiteId: id, selectedFeatureId: null, selection: null }),
  
  addProposal: (proposal) => set((state) => ({ stagedProposals: [...state.stagedProposals, proposal] })),
  
  removeProposal: (id) => set((state) => ({ 
    stagedProposals: state.stagedProposals.filter(p => p.id !== id) 
  }))
}))
