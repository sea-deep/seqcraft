import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerSeqCraftTools } from '../../src/webmcp/register-seqcraft-tools';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { useActivityStore } from '../../src/state/activity-store';
import { ScientificSequence } from '../../src/scientific/nucleotide';
import type { SequenceDocument } from '../../src/domain/document';
import { computeSequenceSha256 } from '../../src/utils/sequence-hash';

describe('Agent Run Lifecycle & Sequence Transaction Tracing', () => {
  let registeredTools = new Map<string, any>();
  let mockMcp: any;

  function createTestDoc(raw: string): SequenceDocument {
    return {
      id: 'doc-test-1',
      name: 'Test Construct',
      topology: 'circular',
      length: raw.length,
      storageMode: 'memory',
      alphabet: 'DNA',
      version: 1,
      source: 'raw',
      sequence: new ScientificSequence(raw, 'DNA'),
      primers: [],
      features: [
        {
          id: 'cds-1',
          name: 'target_cds',
          type: 'CDS',
          strand: 1,
          segments: [{ start0: 0, end0Exclusive: raw.length }],
          qualifiers: {},
          source: 'manual'
        }
      ]
    };
  }

  beforeEach(async () => {
    registeredTools.clear();
    mockMcp = {
      registerTool: vi.fn(async (tool: any) => {
        registeredTools.set(tool.name, tool);
      })
    };
    useWorkspaceStore.setState({
      documents: [],
      activeDocumentId: null,
      selection: null,
      selectedFeatureId: null,
      selectedRestrictionSiteId: null,
      activeView: 'sequence'
    });
    useActivityStore.getState().clearEvents();

    const controller = new AbortController();
    await registerSeqCraftTools(mockMcp, controller.signal);
  });

  // Test 1: WebMCP call → Agent Run event
  it('1. WebMCP call appends a runtime Agent Run event with full provenance', async () => {
    const raw = 'ATGGGTCTCTAA';
    const doc = createTestDoc(raw);
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const docHash = await computeSequenceSha256(raw);

    const activeDocTool = registeredTools.get('seqcraft_get_active_document');
    expect(activeDocTool).toBeDefined();

    const res = await activeDocTool.execute({});
    expect(res.ok).toBe(true);

    const events = useActivityStore.getState().events;
    expect(events.length).toBe(1);

    const ev = events[0];
    expect(ev.toolName).toBe('seqcraft_get_active_document');
    expect(ev.category).toBe('read');
    expect(ev.status).toBe('success');
    expect(ev.callId).toMatch(/^call_/);
    expect(ev.startedAt).toBeGreaterThan(0);
    expect(ev.durationMs).toBeGreaterThanOrEqual(0);
    expect(ev.documentId).toBe(doc.id);
    expect(ev.documentRevisionBefore).toBe(1);
    expect(ev.sequenceHashBefore).toBe(docHash);
  });

  // Test 2: mutation → pending transaction, document unchanged
  it('2. seqcraft_edit_sequence stages pending transaction without mutating document', async () => {
    const raw = 'ATGGGTCTCTAA';
    const doc = createTestDoc(raw);
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const editTool = registeredTools.get('seqcraft_edit_sequence');
    expect(editTool).toBeDefined();

    // Staged mutation: replace BsaI site GGTCTC at 3..9 with GGCCTC (pos 4..9 in 1-based)
    const res = await editTool.execute({
      actionType: 'replace',
      range1: { start1: 4, end1: 9 },
      sequence: 'GGCCTC'
    });

    expect(res.ok).toBe(true);
    expect(res.result.status).toBe('awaiting_approval');
    expect(res.result.transactionId).toBeDefined();

    // Document in workspace must remain completely untouched
    const currentDoc = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
    expect(currentDoc.version).toBe(1);
    expect(currentDoc.sequence!.raw).toBe(raw);

    // Pending transaction in activity store
    const pendingTx = useActivityStore.getState().pendingTransaction;
    expect(pendingTx).toBeDefined();
    expect(pendingTx!.status).toBe('pending');
    expect(pendingTx!.baseRevision).toBe(1);

    // Event status is awaiting_approval
    const ev = useActivityStore.getState().events[0];
    expect(ev.status).toBe('awaiting_approval');
    expect(ev.category).toBe('mutation');
  });

  // Test 3: synonymous mutation → translation unchanged
  it('3. verifies synonymous mutation invariant', async () => {
    // ATGGGTCTCTAA -> ATGGGCCTCTAA
    // Codons: ATG (Met) GGT (Gly) CTC (Leu) TAA (Stop) -> ATG (Met) GGC (Gly) CTC (Leu) TAA (Stop)
    const raw = 'ATGGGTCTCTAA';
    const doc = createTestDoc(raw);
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const editTool = registeredTools.get('seqcraft_edit_sequence');
    const res = await editTool.execute({
      actionType: 'replace',
      range1: { start1: 4, end1: 9 },
      sequence: 'GGCCTC'
    });

    const report = res.result.invariantReport;
    expect(report.passed).toBe(true);
    expect(report.position1).toBe(6); // 1-based index of T->C
    expect(report.originalBase).toBe('T');
    expect(report.mutatedBase).toBe('C');
    expect(report.changedNucleotideCount).toBe(1);
    expect(report.lengthDelta).toBe(0);
    expect(report.coordinatesStable).toBe(true);

    expect(report.cdsVerification).toBeDefined();
    expect(report.cdsVerification.isSynonymous).toBe(true);
    expect(report.cdsVerification.aminoAcidBefore).toBe('Gly-Leu');
    expect(report.cdsVerification.aminoAcidAfter).toBe('Gly-Leu');
  });

  // Test 4: stale revision/hash → commit rejected
  it('4. rejects commit when document revision or hash has diverged', async () => {
    const raw = 'ATGGGTCTCTAA';
    const doc = createTestDoc(raw);
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const editTool = registeredTools.get('seqcraft_edit_sequence');
    await editTool.execute({
      actionType: 'replace',
      range1: { start1: 4, end1: 9 },
      sequence: 'GGCCTC'
    });

    // Concurrently mutate the document in the workspace, making the proposal stale
    useWorkspaceStore.getState().mutateDocumentSequence(doc.id, {
      type: 'insert',
      index0: 0,
      sequence: 'TTT'
    });

    // Attempt to commit the stale transaction
    const commitResult = await useActivityStore.getState().commitPendingTransaction();
    expect(commitResult.success).toBe(false);
    expect(commitResult.error).toContain('Sequence changed after this proposal was analysed');

    // Transaction marked stale
    const pendingTx = useActivityStore.getState().pendingTransaction;
    expect(pendingTx?.status).toBe('stale');
  });

  // Test 5: valid approval → mutation committed + revision/hash transition recorded
  it('5. valid approval commits mutation and records revision/hash transitions', async () => {
    const raw = 'ATGGGTCTCTAA';
    const doc = createTestDoc(raw);
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const hashBefore = await computeSequenceSha256(raw);

    const editTool = registeredTools.get('seqcraft_edit_sequence');
    await editTool.execute({
      actionType: 'replace',
      range1: { start1: 4, end1: 9 },
      sequence: 'GGCCTC'
    });

    const commitResult = await useActivityStore.getState().commitPendingTransaction();
    expect(commitResult.success).toBe(true);

    // Workspace document is mutated
    const updatedDoc = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
    expect(updatedDoc.version).toBe(2);
    expect(updatedDoc.sequence!.raw).toBe('ATGGGCCTCTAA');

    const hashAfter = await computeSequenceSha256('ATGGGCCTCTAA');

    // Activity event updated to success with revision & hash provenance
    const ev = useActivityStore.getState().events[0];
    expect(ev.status).toBe('success');
    expect(ev.documentRevisionBefore).toBe(1);
    expect(ev.documentRevisionAfter).toBe(2);
    expect(ev.sequenceHashBefore).toBe(hashBefore);
    expect(ev.sequenceHashAfter).toBe(hashAfter);
    expect(ev.approvalEvent?.status).toBe('approved');
    expect(useActivityStore.getState().pendingTransaction).toBeNull();
  });

  // Test 6: subsequent WebMCP calls appear as independent Agent Run events
  it('6. subsequent tool invocations append independent events to Agent Run', async () => {
    const raw = 'ATGGGTCTCTAA';
    const doc = createTestDoc(raw);
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    // Call 1: Restriction scan
    const restrictionTool = registeredTools.get('seqcraft_analyze_restriction_sites');
    await restrictionTool.execute({ enzymeNames: ['EcoRI'] });

    // Call 2: ORF scan
    const orfTool = registeredTools.get('seqcraft_find_orfs');
    await orfTool.execute({ minLengthNt: 9 });

    // Call 3: Digest simulation
    const digestTool = registeredTools.get('seqcraft_simulate_digest');
    await digestTool.execute({ enzymeNames: ['EcoRI'] });

    const events = useActivityStore.getState().events;
    expect(events.length).toBe(3);

    // Order: most recent first
    expect(events[0].toolName).toBe('seqcraft_simulate_digest');
    expect(events[1].toolName).toBe('seqcraft_find_orfs');
    expect(events[2].toolName).toBe('seqcraft_analyze_restriction_sites');

    expect(events[0].callId).not.toBe(events[1].callId);
    expect(events[1].callId).not.toBe(events[2].callId);
  });
});
