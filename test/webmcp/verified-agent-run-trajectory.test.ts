import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerSeqCraftTools } from '../../src/webmcp/register-seqcraft-tools';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { useActivityStore } from '../../src/state/activity-store';
import { ScientificSequence } from '../../src/scientific/nucleotide';
import type { SequenceDocument } from '../../src/domain/document';

describe('Verified Agent Run Trajectory Integration', () => {
  let registeredTools = new Map<string, any>();
  let mockMcp: any;

  function createSampleDocument(): SequenceDocument {
    // Arbitrary construct with a CDS and an internal BsaI recognition site GGTCTC
    // ATGGGTCTCTAA
    const seq = 'ATGGGTCTCTAA';
    return {
      id: 'doc-user-construct-1',
      name: 'User Plasmid',
      topology: 'circular',
      length: seq.length,
      storageMode: 'memory',
      alphabet: 'DNA',
      version: 1,
      source: 'raw',
      sequence: new ScientificSequence(seq, 'DNA'),
      primers: [],
      features: [
        {
          id: 'feat-cds-1',
          name: 'target_cds',
          type: 'CDS',
          strand: 1,
          segments: [{ start0: 0, end0Exclusive: seq.length }],
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

  it('executes full 10-step agent trajectory through real WebMCP surface with timeline recording', async () => {
    const doc = createSampleDocument();
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    // 1. seqcraft_get_active_document
    const step1 = await registeredTools.get('seqcraft_get_active_document')!.execute({});
    expect(step1.ok).toBe(true);

    // 2. seqcraft_analyze_restriction_sites
    const step2 = await registeredTools.get('seqcraft_analyze_restriction_sites')!.execute({
      enzymeNames: ['EcoRI']
    });
    expect(step2.ok).toBe(true);

    // 3. seqcraft_simulate_golden_gate (fails/blocked because document is not a multi-part set)
    const step3 = await registeredTools.get('seqcraft_simulate_golden_gate')!.execute({
      enzymeId: 'bsai',
      partDocumentIds: [doc.id, doc.id]
    });
    // Expected to be blocked (internal cut or incompatible junction)
    expect(step3.ok).toBe(false);

    // 4. seqcraft_focus_region
    const step4 = await registeredTools.get('seqcraft_focus_region')!.execute({
      start1: 4,
      end1: 9
    });
    expect(step4.ok).toBe(true);

    // 5. seqcraft_domesticate_sequence
    const step5 = await registeredTools.get('seqcraft_domesticate_sequence')!.execute({
      enzymeName: 'BsaI'
    });
    expect(step5.ok).toBe(true);

    // 6. seqcraft_edit_sequence (stages transaction awaiting human approval)
    const step6 = await registeredTools.get('seqcraft_edit_sequence')!.execute({
      actionType: 'replace',
      range1: { start1: 4, end1: 9 },
      sequence: 'GGCCTC'
    });
    expect(step6.ok).toBe(true);
    expect(step6.result.status).toBe('awaiting_approval');
    expect(useActivityStore.getState().pendingTransaction).not.toBeNull();

    // 7. Human clicks Apply
    const applyResult = await useActivityStore.getState().commitPendingTransaction();
    expect(applyResult.success).toBe(true);
    expect(useActivityStore.getState().pendingTransaction).toBeNull();

    const mutatedDoc = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
    expect(mutatedDoc.version).toBe(2);
    expect(mutatedDoc.sequence!.raw).toBe('ATGGGCCTCTAA');

    // 8. Agent independently calls restriction revalidation
    const step8 = await registeredTools.get('seqcraft_analyze_restriction_sites')!.execute({
      enzymeNames: ['EcoRI']
    });
    expect(step8.ok).toBe(true);

    // 9. Agent independently calls Golden Gate simulation
    const step9 = await registeredTools.get('seqcraft_simulate_golden_gate')!.execute({
      enzymeId: 'bsai',
      partDocumentIds: [doc.id, doc.id]
    });
    // Recorded in Agent Run event log regardless of biological outcome
    expect(step9).toBeDefined();

    // 10. Agent calls protocol generation
    const step10 = await registeredTools.get('seqcraft_generate_opentrons_protocol')!.execute({
      reactionType: 'digest',
      digestParameters: {
        enzymeNames: ['EcoRI']
      }
    });
    expect(step10.ok).toBe(true);

    // Verify timeline contains all 9 WebMCP calls in exact order
    const events = useActivityStore.getState().events;
    expect(events.length).toBe(9);

    // Timeline is ordered most recent first
    expect(events[0].toolName).toBe('seqcraft_generate_opentrons_protocol');
    expect(events[1].toolName).toBe('seqcraft_simulate_golden_gate');
    expect(events[2].toolName).toBe('seqcraft_analyze_restriction_sites');
    expect(events[3].toolName).toBe('seqcraft_edit_sequence');
    expect(events[3].status).toBe('success');
    expect(events[3].documentRevisionBefore).toBe(1);
    expect(events[3].documentRevisionAfter).toBe(2);
    expect(events[3].approvalEvent?.status).toBe('approved');
    expect(events[4].toolName).toBe('seqcraft_domesticate_sequence');
    expect(events[5].toolName).toBe('seqcraft_focus_region');
    expect(events[6].toolName).toBe('seqcraft_simulate_golden_gate');
    expect(events[7].toolName).toBe('seqcraft_analyze_restriction_sites');
    expect(events[8].toolName).toBe('seqcraft_get_active_document');
  });
});
