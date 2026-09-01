import { create } from 'zustand';
import type { RestrictionCloneProposal } from '../domain/cloning';

interface CloningStore {
  pendingProposal: RestrictionCloneProposal | null;
  selectedCandidateId: string | null;
  setPendingProposal: (proposal: RestrictionCloneProposal) => void;
  selectCandidate: (id: string) => void;
  clearPendingProposal: () => void;
}

export const useCloningStore = create<CloningStore>((set) => ({
  pendingProposal: null,
  selectedCandidateId: null,
  setPendingProposal: (proposal) => set({ 
    pendingProposal: proposal, 
    selectedCandidateId: proposal.candidates.length > 0 ? proposal.candidates[0].id : null 
  }),
  selectCandidate: (id) => set({ selectedCandidateId: id }),
  clearPendingProposal: () => set({ pendingProposal: null, selectedCandidateId: null }),
}));
