import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { useCloningStore } from '../../src/state/cloning-store';
import { createDemoDonorDocument } from '../../src/data/demo-workspace';
import { importGenBank } from '../../src/import/genbank';
import { DEMO_GENBANK } from '../../src/data/demo-workspace';
import { prepareRestrictionClone, approveRestrictionClone, cancelRestrictionClone } from '../../src/application/cloning';
import { seqcraftPrepareRestrictionCloneTool } from '../../src/webmcp/register-seqcraft-tools';

describe('Restriction Cloning Application Flow', () => {
  let vectorDocId: string;
  let insertDocId: string;

  beforeEach(() => {
    const store = useWorkspaceStore.getState();
    store.documents = [];
    store.activeDocumentId = null;
    
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    const donor = createDemoDonorDocument();
    
    store.addDocument(pUC19);
    store.addDocument(donor);
    store.setActiveDocument(pUC19.id);
    
    vectorDocId = pUC19.id;
    insertDocId = donor.id;
    
    useCloningStore.getState().clearPendingProposal();
  });

  it('prepare creates pending proposal and leaves workspace unchanged', () => {
    const initialDocs = useWorkspaceStore.getState().documents.length;
    
    const res = prepareRestrictionClone({
      vectorDocumentId: vectorDocId,
      insertDocumentId: insertDocId,
      enzymeNames: ['EcoRI', 'HindIII']
    });
    
    expect(res.ok).toBe(true);
    expect(res.proposal).toBeDefined();
    
    const cloneStore = useCloningStore.getState();
    expect(cloneStore.pendingProposal).toBeDefined();
    expect(cloneStore.pendingProposal!.candidates.length).toBe(1); // One directional clone
    expect(cloneStore.selectedCandidateId).toBe(cloneStore.pendingProposal!.candidates[0].id);
    
    expect(useWorkspaceStore.getState().documents.length).toBe(initialDocs);
  });

  it('cancel clears proposal and leaves workspace unchanged', () => {
    prepareRestrictionClone({
      insertDocumentId: insertDocId,
      enzymeNames: ['EcoRI', 'HindIII']
    });
    
    cancelRestrictionClone();
    
    expect(useCloningStore.getState().pendingProposal).toBeNull();
    expect(useCloningStore.getState().selectedCandidateId).toBeNull();
    expect(useWorkspaceStore.getState().documents.length).toBe(2);
  });

  it('approve creates new document and activates map view', () => {
    prepareRestrictionClone({
      insertDocumentId: insertDocId,
      enzymeNames: ['EcoRI', 'HindIII']
    });
    
    const cloneStore = useCloningStore.getState();
    const candidateLength = cloneStore.pendingProposal!.candidates[0].recombinantLengthBp;
    const candidateSequence = cloneStore.pendingProposal!.candidates[0].recombinantSequence;
    const candidateFeatures = cloneStore.pendingProposal!.candidates[0].recombinantFeatures;
    
    const newDoc = approveRestrictionClone();
    
    expect(newDoc).toBeDefined();
    expect(newDoc!.topology).toBe('circular');
    expect(newDoc!.sequence.length).toBe(candidateLength);
    expect(newDoc!.sequence.raw).toBe(candidateSequence);
    expect(newDoc!.features).toEqual(candidateFeatures);
    
    const wsStore = useWorkspaceStore.getState();
    expect(wsStore.documents.length).toBe(3);
    expect(wsStore.activeDocumentId).toBe(newDoc!.id);
    expect(wsStore.activeView).toBe('map');
    
    // proposal cleared
    expect(useCloningStore.getState().pendingProposal).toBeNull();
  });

  it('WebMCP prepare tool creates proposal and returns requiresHumanApproval', async () => {
    const res = await seqcraftPrepareRestrictionCloneTool.execute({
      vectorDocumentId: vectorDocId,
      insertDocumentId: insertDocId,
      enzymeNames: ['EcoRI', 'HindIII']
    });
    
    console.log(res);
    expect(res.ok).toBe(true);
    expect(res.result.requiresHumanApproval).toBe(true);
    expect(res.result.recombinantCandidateLengths).toHaveLength(1);
    expect(res.result.junctionCompatibility.junction1).toBe(true);
    expect(res.result.junctionCompatibility.junction2).toBe(true);
    
    expect(useCloningStore.getState().pendingProposal).not.toBeNull();
  });
});
