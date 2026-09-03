import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  registerSeqCraftTools, 
  seqcraftGetCapabilitiesTool,
  seqcraftGetActiveDocumentTool,
  seqcraftGetWorkspaceContextTool,
  seqcraftGetSelectedContextTool,
  seqcraftGetDocumentRevisionTool,
  seqcraftGetTransactionStatusTool,
  seqcraftAnalyzeRestrictionSitesTool,
  seqcraftSimulateDigestTool,
  seqcraftAnalyzePrimerTool,
  seqcraftSimulatePcrTool,
  seqcraftFocusRegionTool,
  seqcraftShowRestrictionSiteTool,
  seqcraftShowFeatureTool,
  seqcraftDomesticateSequenceTool,
  ALL_SEQCRAFT_TOOLS
} from '../../src/webmcp/register-seqcraft-tools';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { useActivityStore } from '../../src/state/activity-store';
import { importGenBank } from '../../src/import/genbank';
import { DEMO_GENBANK } from '../../src/data/demo-workspace';
import { reverseComplementIupac } from '../../src/scientific/restriction-analysis';
import { ScientificSequence } from '../../src/scientific/nucleotide';

describe('WebMCP Tool Registration and Execution', () => {
  let registeredTools = new Map<string, any>();
  let mockMcp: any;

  beforeEach(() => {
    registeredTools.clear();
    mockMcp = {
      registerTool: vi.fn(async (tool: any, options: any) => {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.execute).toBe('function');
        expect(typeof tool.annotations.untrustedContentHint).toBe('boolean');
        expect(options.signal).toBeInstanceOf(AbortSignal);
        
        // fail if it uses handler
        expect(tool.handler).toBeUndefined();

        registeredTools.set(tool.name, tool);
        return undefined;
      })
    };
    useWorkspaceStore.setState({
      documents: [],
      activeDocumentId: null,
      selection: null,
      selectedFeatureId: null,
      selectedRestrictionSiteId: null,
      activeView: 'sequence',
    });
    useActivityStore.getState().clearEvents();
  });

  it('registers exactly 50 tools asynchronously', async () => {
    const controller = new AbortController();
    await registerSeqCraftTools(mockMcp, controller.signal);
    
    expect(mockMcp.registerTool).toHaveBeenCalledTimes(ALL_SEQCRAFT_TOOLS.length);
    expect(registeredTools.size).toBe(ALL_SEQCRAFT_TOOLS.length);
    
    const expectedNames = ALL_SEQCRAFT_TOOLS.map(t => t.name).sort();
    const actualNames = [...registeredTools.keys()].sort();
    expect(actualNames).toEqual(expectedNames);
  });

  it('scientific tools have readOnlyHint=true, action tools have readOnlyHint=false', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    
    // Scientific (read-only)
    const readOnlyTools = [
      'seqcraft_get_capabilities',
      'seqcraft_get_active_document',
      'seqcraft_get_workspace_context',
      'seqcraft_get_selected_context',
      'seqcraft_get_document_revision',
      'seqcraft_get_transaction_status',
      'seqcraft_analyze_restriction_sites',
      'seqcraft_simulate_digest',
      'seqcraft_analyze_primer',
      'seqcraft_simulate_pcr',
      'seqcraft_list_documents',
      'seqcraft_list_features',
      'seqcraft_list_primers',
      'seqcraft_compare_documents',
      'seqcraft_find_orfs',
      'seqcraft_detect_known_features',
      'seqcraft_generate_opentrons_protocol',
      'seqcraft_find_crispr_targets',
      'seqcraft_simulate_golden_gate',
      'seqcraft_domesticate_sequence',
      'seqcraft_screen_biosecurity',
    ];
    for (const name of readOnlyTools) {
      expect(registeredTools.get(name)!.annotations.readOnlyHint).toBe(true);
    }

    // Action (navigation, sequence mutation, or staged persistent change)
    const actionTools = [
      'seqcraft_focus_region',
      'seqcraft_show_restriction_site',
      'seqcraft_show_feature',
      'seqcraft_propose_annotation',
      'seqcraft_prepare_restriction_clone',
      'seqcraft_edit_sequence',
      'seqcraft_rotate_origin',
    ];
    for (const name of actionTools) {
      expect(registeredTools.get(name)!.annotations.readOnlyHint).toBe(false);
    }
  });

  it('advertises privacy, coordinates, and approval semantics without returning user content', async () => {
    const response = await seqcraftGetCapabilitiesTool.execute({});
    expect(response.ok).toBe(true);
    expect(response.result.privacy.rawSequences).toBe('browser-only');
    expect(response.result.coordinateContract.internalApplicationState).toBe('0-based half-open');
    expect(response.result.approval.persistentScientificChanges).toContain('human approval');
    expect(seqcraftGetCapabilitiesTool.annotations.untrustedContentHint).toBe(false);
  });

  it('marks tools that can return imported or user-authored content as untrusted', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    for (const [name, tool] of registeredTools) {
      if (name === 'seqcraft_get_capabilities') continue;
      expect(tool.annotations.untrustedContentHint).toBe(true);
    }
  });

  it('active document resolves at execution time and missing active document produces structured error', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const getActiveDoc = registeredTools.get('seqcraft_get_active_document')!.execute;
    
    // initially no active doc
    let res = await getActiveDoc({});
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('NO_ACTIVE_DOCUMENT');
    
    // add doc
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);
    
    res = await getActiveDoc({});
    expect(res.ok).toBe(true);
    expect(res.result.lengthBp).toBe(2686);
    expect(res.result.topology).toBe('circular');
  });

  it('restriction tool invokes existing restriction engine (and unknown enzyme produces structured error)', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);
    
    const analyzeRes = registeredTools.get('seqcraft_analyze_restriction_sites')!.execute;
    
    // error
    const errRes = await analyzeRes({ enzymeNames: ['NotAnEnzyme'] });
    expect(errRes.ok).toBe(false);
    expect(errRes.error.code).toBe('UNKNOWN_ENZYME');
    expect(errRes.error.details.availableBuiltinEnzymes).toContain('EcoRI');
    
    // success
    const res = await analyzeRes({ enzymeNames: ['EcoRI', 'HindIII'] });
    expect(res.ok).toBe(true);
    expect(res.result.sites.length).toBe(2);
    expect(res.result.sites[0].start1).toBeGreaterThan(0);
  });

  it('digest tool returns expected pUC19 fragment sizes', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);
    
    const digest = registeredTools.get('seqcraft_simulate_digest')!.execute;
    const res = await digest({ enzymeNames: ['EcoRI', 'HindIII'] });
    
    expect(res.ok).toBe(true);
    expect(res.result.fragments.length).toBe(2);
    
    const lengths = res.result.fragments.map((f: any) => f.lengthBp).sort((a: number, b: number) => a - b);
    expect(lengths).toEqual([51, 2635]);
  });

  it('primer tool returns expected pUC19 binding', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);
    
    const analyzePrimer = registeredTools.get('seqcraft_analyze_primer')!.execute;
    const seq = pUC19.sequence.raw.substring(99, 121);
    
    const res = await analyzePrimer({ sequence: seq });
    expect(res.ok).toBe(true);
    expect(res.result.bindingCount).toBe(1);
    expect(res.result.bindings[0].start1).toBe(100);
    expect(res.result.bindings[0].end1).toBe(121);
  });

  it('PCR tool returns the known pUC19 422 bp product', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);
    
    const fwd = pUC19.sequence.raw.substring(99, 121);
    const rev = reverseComplementIupac(pUC19.sequence.raw.substring(499, 521));
    
    const pcr = registeredTools.get('seqcraft_simulate_pcr')!.execute;
    const res = await pcr({ forwardPrimerSequence: fwd, reversePrimerSequence: rev });
    
    expect(res.ok).toBe(true);
    expect(res.result.productCount).toBe(1);
    expect(res.result.products[0].lengthBp).toBe(422);
  });

  // ─── New action tool tests ──────────────────────────────────

  it('seqcraft_focus_region changes shared selection state', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);

    const focus = registeredTools.get('seqcraft_focus_region')!.execute;
    const res = await focus({ start1: 400, end1: 500 });

    expect(res.ok).toBe(true);
    expect(res.result.start1).toBe(400);
    expect(res.result.end1).toBe(500);
    expect(res.result.lengthBp).toBe(101);

    const sel = useWorkspaceStore.getState().selection;
    expect(sel).not.toBeNull();
    expect(sel!.start0).toBe(399);
    expect(sel!.end0Exclusive).toBe(500);
  });

  it('seqcraft_focus_region with view=map switches activeView', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);

    expect(useWorkspaceStore.getState().activeView).toBe('sequence');
    
    await registeredTools.get('seqcraft_focus_region')!.execute({ start1: 100, end1: 200, view: 'map' });
    
    expect(useWorkspaceStore.getState().activeView).toBe('map');
  });

  it('seqcraft_show_restriction_site selects the real EcoRI site on pUC19', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);

    const showSite = registeredTools.get('seqcraft_show_restriction_site')!.execute;
    const res = await showSite({ enzymeName: 'EcoRI', occurrence: 1, view: 'map' });

    expect(res.ok).toBe(true);
    expect(res.result.enzymeName).toBe('EcoRI');
    expect(res.result.selectedRestrictionSiteId).toBeTruthy();
    expect(useWorkspaceStore.getState().selectedRestrictionSiteId).toBe(res.result.selectedRestrictionSiteId);
    expect(useWorkspaceStore.getState().activeView).toBe('map');
  });

  it('seqcraft_show_feature with AmpR selects the real pUC19 feature', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);

    const showFeat = registeredTools.get('seqcraft_show_feature')!.execute;
    const res = await showFeat({ featureName: 'AmpR', view: 'map' });

    expect(res.ok).toBe(true);
    expect(res.result.name).toMatch(/amp/i);
    expect(res.result.selectedFeatureId).toBeTruthy();
    expect(useWorkspaceStore.getState().selectedFeatureId).toBe(res.result.selectedFeatureId);
    expect(useWorkspaceStore.getState().activeView).toBe('map');
  });

  it('activity event appears after each action tool execution', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);

    await registeredTools.get('seqcraft_focus_region')!.execute({ start1: 100, end1: 200 });
    await registeredTools.get('seqcraft_show_restriction_site')!.execute({ enzymeName: 'EcoRI' });
    await registeredTools.get('seqcraft_show_feature')!.execute({ featureName: 'AmpR' });
    
    const events = useActivityStore.getState().events;
    expect(events.length).toBe(3);

    const toolNames = events.map(e => e.toolName);
    expect(toolNames).toContain('seqcraft_focus_region');
    expect(toolNames).toContain('seqcraft_show_restriction_site');
    expect(toolNames).toContain('seqcraft_show_feature');

    // All succeeded
    events.forEach(e => expect(e.status).toBe('success'));
  });

  it('active document is resolved at execution time for action tools', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    
    // No doc — should fail
    const focusTool = registeredTools.get('seqcraft_focus_region')!.execute;
    const res1 = await focusTool({ start1: 1, end1: 100 });
    expect(res1.ok).toBe(false);
    expect(res1.error.code).toBe('NO_ACTIVE_DOCUMENT');

    // Add doc — same tool should succeed
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);
    
    const res2 = await focusTool({ start1: 1, end1: 100 });
    expect(res2.ok).toBe(true);
  });

  it('compares circular documents invariantly and returns annotation/protein-aware structure', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const reference = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    const raw = reference.sequence.raw;
    const rotation = 317;
    const query = { ...reference, id: 'rotated-puc19', name: 'Rotated pUC19', sequence: new ScientificSequence(raw.slice(rotation) + raw.slice(0, rotation), 'DNA'), features: reference.features.map(item => ({ ...item, segments: item.segments.flatMap(segment => { const size = segment.end0Exclusive - segment.start0; const start0 = (segment.start0 - rotation + raw.length) % raw.length; return start0 + size <= raw.length ? [{ start0, end0Exclusive: start0 + size }] : [{ start0, end0Exclusive: raw.length }, { start0: 0, end0Exclusive: start0 + size - raw.length }]; }) })) };
    useWorkspaceStore.getState().addDocuments([reference, query]);
    const response = await registeredTools.get('seqcraft_compare_documents')!.execute({ referenceDocumentId: reference.id, queryDocumentId: query.id });
    expect(response.ok).toBe(true);
    expect(response.result.differenceCount).toBe(0);
    expect(response.result.circularOriginInvariant).toBe(true);
    expect(response.result.coordinateSystem).toBe('0-based-half-open-canonical');
    expect(response.result.representation).toMatchObject({ originChanged: true, moleculeIdentityUnchanged: true });
    expect(response.result.unchangedFeatureCount).toBeGreaterThan(0);
  });

  it('registration uses AbortSignal', async () => {
    const controller = new AbortController();
    await registerSeqCraftTools(mockMcp, controller.signal);
    
    // Every call received the signal
    const calls = mockMcp.registerTool.mock.calls;
    expect(calls.length).toBe(ALL_SEQCRAFT_TOOLS.length);
    calls.forEach((call: any[]) => {
      expect(call[1].signal).toBe(controller.signal);
    });
  });

  it('generates executable Opentrons protocol via WebMCP tool', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const res = await registeredTools.get('seqcraft_generate_opentrons_protocol')!.execute({
      reactionType: 'pcr',
      numReactions: 2,
      pcrParameters: {
        forwardPrimerName: 'Fwd-1',
        reversePrimerName: 'Rev-1',
        ampliconLengthBp: 850,
        annealingTempC: 56.0
      }
    });

    expect(res.ok).toBe(true);
    expect(res.result.pythonCode).toContain('from opentrons import protocol_api');
    expect(res.result.filename).toContain('opentrons_pcr_');
    expect(res.result.billOfMaterials.length).toBeGreaterThan(3);
  });

  it('scans CRISPR SpCas9 target sites via WebMCP tool', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const res = await registeredTools.get('seqcraft_find_crispr_targets')!.execute({
      minQualityScore: 40,
      maxResults: 10
    });

    expect(res.ok).toBe(true);
    expect(res.result.count).toBeGreaterThan(0);
    expect(res.result.targets[0].spacer.length).toBe(20);
    expect(res.result.targets[0].pamRange).toBeDefined();
    expect(res.result.targets[0].qualityScore).toBeGreaterThanOrEqual(40);
  });

  it('domesticates internal Type IIS sites via WebMCP tool', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const res = await registeredTools.get('seqcraft_domesticate_sequence')!.execute({
      enzymeId: 'bsai',
      readingFrame: 1
    });

    expect(res.ok).toBe(true);
    expect(res.result.enzyme).toBe('BsaI');
    expect(res.result.summary).toBeDefined();
  });

  it('screens active DNA construct for biosecurity compliance via WebMCP tool', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const res = await registeredTools.get('seqcraft_screen_biosecurity')!.execute({});

    expect(res.ok).toBe(true);
    expect(res.result.isCompliant).toBe(true);
    expect(res.result.status).toBe('NO_LOCAL_MATCH');
    expect(res.result.summary).toContain('No matches found');
  });

  it('inserts DNA bases into active construct via WebMCP tool', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const origLen = doc.length;
    const origVersion = doc.version;
    const res = await registeredTools.get('seqcraft_edit_sequence')!.execute({
      actionType: 'insert',
      position1: 10,
      sequence: 'CACCACCACCACCACCAC' // 18 bp His-6
    });

    expect(res.ok).toBe(true);
    expect(res.isError).toBe(false);
    expect(res.result.status).toBe('awaiting_approval');
    expect(res.result.transactionId).toBeDefined();

    // Confirm store remains unchanged without human approval
    const updated = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
    expect(updated.length).toBe(origLen);
    expect(updated.version).toBe(origVersion);
  });

  it('rotates circular plasmid origin via WebMCP tool', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const origVersion = doc.version;
    const res = await registeredTools.get('seqcraft_rotate_origin')!.execute({
      newOrigin1: 50
    });

    expect(res.ok).toBe(true);
    expect(res.isError).toBe(false);
    expect(res.result.status).toBe('awaiting_approval');
    expect(res.result.transactionId).toBeDefined();

    const updated = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
    expect(updated.version).toBe(origVersion);
  });

  it('exports document as GenBank, FASTA, and SeqCraft format via WebMCP tool', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const exportTool = registeredTools.get('seqcraft_export_document');
    expect(exportTool).toBeDefined();

    // GenBank export
    const gbRes = await exportTool.execute({ format: 'genbank' });
    expect(gbRes.ok).toBe(true);
    expect(gbRes.result.format).toBe('genbank');
    expect(gbRes.result.content).toContain('LOCUS');
    expect(gbRes.result.content).toContain('ORIGIN');
    expect(gbRes.result.content).toContain('//');

    // FASTA export
    const fastaRes = await exportTool.execute({ format: 'fasta' });
    expect(fastaRes.ok).toBe(true);
    expect(fastaRes.result.format).toBe('fasta');
    expect(fastaRes.result.content).toContain(`>${doc.name}`);

    // SeqCraft export
    const scRes = await exportTool.execute({ format: 'seqcraft' });
    expect(scRes.ok).toBe(true);
    expect(scRes.result.format).toBe('seqcraft');
    const parsed = JSON.parse(scRes.result.content);
    expect(parsed.name).toBe(doc.name);
  });

  it('undos and redos sequence mutations via WebMCP tools', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const origSeq = doc.sequence!.raw;

    // Mutate document
    useWorkspaceStore.getState().mutateDocumentSequence(doc.id, {
      type: 'replace',
      start0: 0,
      end0Exclusive: 10,
      replacement: 'NNNNNNNNNN',
    });

    const undoTool = registeredTools.get('seqcraft_undo');
    const redoTool = registeredTools.get('seqcraft_redo');
    expect(undoTool).toBeDefined();
    expect(redoTool).toBeDefined();

    // Undo
    const undoRes = await undoTool.execute({});
    expect(undoRes.ok).toBe(true);
    const restoredDoc = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
    expect(restoredDoc.sequence!.raw).toBe(origSeq);

    // Redo
    const redoRes = await redoTool.execute({});
    expect(redoRes.ok).toBe(true);
    const redoneDoc = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
    expect(redoneDoc.sequence!.raw.startsWith('NNNNNNNNNN')).toBe(true);
  });

  it('registers all WebMCP tools', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    expect(registeredTools.size).toBe(ALL_SEQCRAFT_TOOLS.length);
  });

  // ─── Mandate 13: New tool test cases ─────────────────────────────────

  describe('seqcraft_get_workspace_context', () => {
    it('returns null activeDocument when no document is open', async () => {
      const res = await seqcraftGetWorkspaceContextTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.activeDocument).toBeNull();
      expect(res.result.workspace.selectedRange).toBeNull();
      expect(res.result.workspace.selectedFeatureId).toBeNull();
      expect(res.result.selectedFeature).toBeNull();
      expect(res.result.pendingTransaction).toBeNull();
      expect(res.result.webmcp.registeredToolCount).toBeGreaterThanOrEqual(0);
    });

    it('returns active circular document metadata with hash and gcContent', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      const res = await seqcraftGetWorkspaceContextTool.execute({});
      expect(res.ok).toBe(true);
      const active = res.result.activeDocument;
      expect(active).not.toBeNull();
      expect(active.id).toBe(doc.id);
      expect(active.name).toBe(doc.name);
      expect(active.lengthBp).toBe(doc.length);
      expect(active.topology).toBe('circular');
      expect(active.revision).toBe(doc.version);
      expect(typeof active.gcContent).toBe('number');
      expect(typeof active.sequenceHash).toBe('string');
      expect(active.sequenceHash.length).toBe(64);
      // Privacy: no raw sequence
      expect(active.sequence).toBeUndefined();
    });

    it('returns active linear document metadata correctly', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      const linearDoc = { ...doc, id: 'linear_puc19', topology: 'linear' as const };
      useWorkspaceStore.getState().addDocument(linearDoc);
      useWorkspaceStore.getState().setActiveDocument(linearDoc.id);

      const res = await seqcraftGetWorkspaceContextTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.activeDocument.topology).toBe('linear');
    });

    it('returns selected range in 1-based coordinates', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);
      useWorkspaceStore.getState().setSelection(doc.id, 99, 199); // 0-based half-open

      const res = await seqcraftGetWorkspaceContextTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.workspace.selectedRange).not.toBeNull();
      expect(res.result.workspace.selectedRange.start1).toBe(100);
      expect(res.result.workspace.selectedRange.end1).toBe(199);
    });

    it('returns selected feature when a feature is active', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);
      const feat = doc.features[0];
      if (feat) {
        useWorkspaceStore.getState().selectFeature(feat.id);
        const res = await seqcraftGetWorkspaceContextTool.execute({});
        expect(res.ok).toBe(true);
        expect(res.result.selectedFeature).not.toBeNull();
        expect(res.result.selectedFeature.id).toBe(feat.id);
        expect(res.result.selectedFeature.name).toBe(feat.name);
        expect(res.result.selectedFeature.strand).toBe(feat.strand === 1 ? '+' : '-');
      }
    });

    it('reflects pending transaction status awaiting_approval', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      const realHash = await new Promise<string>(resolve => {
        import('../../src/utils/sequence-hash').then(m =>
          m.computeSequenceSha256(doc.sequence!.raw).then(resolve)
        );
      });

      useActivityStore.getState().setPendingTransaction({
        id: 'tx_test',
        documentId: doc.id,
        baseRevision: doc.version,
        baseSequenceHash: realHash,
        operation: { type: 'replace', start0: 0, end0Exclusive: 1, replacement: 'A' },
        affectedRange: { start0: 0, end0Exclusive: 1 },
        beforeFragment: 'G',
        afterFragment: 'A',
        invariantReport: { passed: true, position1: 1, originalBase: 'G', mutatedBase: 'A', changedNucleotideCount: 1, lengthBefore: doc.length, lengthAfter: doc.length, lengthDelta: 0, coordinatesStable: true, affectedFeatureNames: [], summary: 'Test edit' },
        expectedSequenceHash: realHash,
        status: 'pending',
        createdAt: Date.now()
      });

      const res = await seqcraftGetWorkspaceContextTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.pendingTransaction).not.toBeNull();
      expect(res.result.pendingTransaction.id).toBe('tx_test');
      expect(res.result.pendingTransaction.status).toBe('awaiting_approval');
    });
  });

  describe('seqcraft_get_selected_context', () => {
    it('returns empty selection when nothing selected', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      const res = await seqcraftGetSelectedContextTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.documentId).toBe(doc.id);
      expect(res.result.revision).toBe(doc.version);
      expect(res.result.selection).toBeNull();
      expect(res.result.overlappingFeatures).toEqual([]);
    });

    it('returns selection with correct 1-based coordinates and local sequence slice', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);
      useWorkspaceStore.getState().setSelection(doc.id, 10, 20);

      const res = await seqcraftGetSelectedContextTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.selection).not.toBeNull();
      expect(res.result.selection.start1).toBe(11);
      expect(res.result.selection.end1).toBe(20);
      expect(res.result.selection.length).toBe(10);
      expect(res.result.selection.sequence).toBe(doc.sequence!.raw.slice(10, 20));
    });

    it('returns overlapping features for selection with strand +/-', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      // Select locus overlapping AmpR or first feature
      const feat = doc.features[0];
      if (feat && feat.segments.length > 0) {
        useWorkspaceStore.getState().setSelection(doc.id, feat.segments[0].start0, feat.segments[0].end0Exclusive);
        const res = await seqcraftGetSelectedContextTool.execute({});
        expect(res.ok).toBe(true);
        expect(res.result.overlappingFeatures.length).toBeGreaterThan(0);
        const first = res.result.overlappingFeatures[0];
        expect(first.strand === '+' || first.strand === '-').toBe(true);
        expect(typeof first.start1).toBe('number');
        expect(typeof first.end1).toBe('number');
      }
    });

    it('returns error when no active document', async () => {
      const res = await seqcraftGetSelectedContextTool.execute({});
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe('NO_ACTIVE_DOCUMENT');
    });
  });

  describe('seqcraft_get_document_revision', () => {
    it('returns current revision and canonical sequence hash matching document', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      const res = await seqcraftGetDocumentRevisionTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.documentId).toBe(doc.id);
      expect(res.result.documentName).toBe(doc.name);
      expect(res.result.revision).toBe(doc.version);
      expect(typeof res.result.sequenceHash).toBe('string');
      expect(res.result.sequenceHash).toHaveLength(64);
      expect(res.result.lengthBp).toBe(doc.length);
    });

    it('hash and revision change after real mutation', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      const res1 = await seqcraftGetDocumentRevisionTool.execute({});
      const origHash = res1.result.sequenceHash;
      const origRev = res1.result.revision;

      useWorkspaceStore.getState().mutateDocumentSequence(doc.id, {
        type: 'replace',
        start0: 0,
        end0Exclusive: 5,
        replacement: 'TTTTT'
      });

      const res2 = await seqcraftGetDocumentRevisionTool.execute({});
      expect(res2.result.revision).toBe(origRev + 1);
      expect(res2.result.sequenceHash).not.toBe(origHash);
    });
  });

  describe('seqcraft_get_transaction_status', () => {
    it('returns null transaction when no transaction exists', async () => {
      const res = await seqcraftGetTransactionStatusTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.transaction).toBeNull();
    });

    it('returns awaiting_approval status for staged transaction', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      const hashBefore = await new Promise<string>(resolve => {
        import('../../src/utils/sequence-hash').then(m =>
          m.computeSequenceSha256(doc.sequence!.raw).then(resolve)
        );
      });

      useActivityStore.getState().setPendingTransaction({
        id: 'tx_status_test',
        documentId: doc.id,
        baseRevision: doc.version,
        baseSequenceHash: hashBefore,
        operation: { type: 'replace', start0: 0, end0Exclusive: 1, replacement: 'A' },
        affectedRange: { start0: 0, end0Exclusive: 1 },
        beforeFragment: doc.sequence!.raw[0],
        afterFragment: 'A',
        invariantReport: { passed: true, position1: 1, originalBase: doc.sequence!.raw[0], mutatedBase: 'A', changedNucleotideCount: 1, lengthBefore: doc.length, lengthAfter: doc.length, lengthDelta: 0, coordinatesStable: true, affectedFeatureNames: [], summary: 'test' },
        expectedSequenceHash: hashBefore,
        status: 'pending',
        createdAt: Date.now()
      });

      const res = await seqcraftGetTransactionStatusTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.transaction).not.toBeNull();
      expect(res.result.transaction.id).toBe('tx_status_test');
      expect(res.result.transaction.status).toBe('awaiting_approval');
      expect(res.result.transaction.uiPresented).toBe(true);
      expect(res.result.transaction.currentRevision).toBe(doc.version);
    });

    it('detects stale revision when document was mutated externally', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      useActivityStore.getState().setPendingTransaction({
        id: 'tx_stale_rev_test',
        documentId: doc.id,
        baseRevision: doc.version - 1, // old revision
        baseSequenceHash: 'deadbeef'.repeat(8),
        operation: { type: 'replace', start0: 0, end0Exclusive: 1, replacement: 'A' },
        affectedRange: { start0: 0, end0Exclusive: 1 },
        beforeFragment: 'G', afterFragment: 'A',
        invariantReport: { passed: true, position1: 1, originalBase: 'G', mutatedBase: 'A', changedNucleotideCount: 1, lengthBefore: doc.length, lengthAfter: doc.length, lengthDelta: 0, coordinatesStable: true, affectedFeatureNames: [], summary: 'test' },
        expectedSequenceHash: 'deadbeef'.repeat(8),
        status: 'pending',
        createdAt: Date.now()
      });

      const res = await seqcraftGetTransactionStatusTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.transaction.status).toBe('stale');
      expect(res.result.transaction.staleReason).toContain('revision changed');
    });

    it('detects stale hash when sequence content differs', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      useActivityStore.getState().setPendingTransaction({
        id: 'tx_stale_hash_test',
        documentId: doc.id,
        baseRevision: doc.version, // correct revision
        baseSequenceHash: 'wronghash'.padEnd(64, '0'), // wrong hash
        operation: { type: 'replace', start0: 0, end0Exclusive: 1, replacement: 'A' },
        affectedRange: { start0: 0, end0Exclusive: 1 },
        beforeFragment: 'G', afterFragment: 'A',
        invariantReport: { passed: true, position1: 1, originalBase: 'G', mutatedBase: 'A', changedNucleotideCount: 1, lengthBefore: doc.length, lengthAfter: doc.length, lengthDelta: 0, coordinatesStable: true, affectedFeatureNames: [], summary: 'test' },
        expectedSequenceHash: 'wronghash'.padEnd(64, '0'),
        status: 'pending',
        createdAt: Date.now()
      });

      const res = await seqcraftGetTransactionStatusTool.execute({});
      expect(res.ok).toBe(true);
      expect(res.result.transaction.status).toBe('stale');
      expect(res.result.transaction.staleReason).toContain('Sequence content changed');
    });

    it('reports applied status with provenance after commit', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      const hashBefore = await new Promise<string>(resolve => {
        import('../../src/utils/sequence-hash').then(m =>
          m.computeSequenceSha256(doc.sequence!.raw).then(resolve)
        );
      });

      const txId = 'tx_apply_test';
      const tx = {
        id: txId,
        documentId: doc.id,
        baseRevision: doc.version,
        baseSequenceHash: hashBefore,
        operation: { type: 'replace' as const, start0: 0, end0Exclusive: 1, replacement: 'A' },
        affectedRange: { start0: 0, end0Exclusive: 1 },
        beforeFragment: doc.sequence!.raw[0],
        afterFragment: 'A',
        invariantReport: { passed: true, position1: 1, originalBase: doc.sequence!.raw[0], mutatedBase: 'A', changedNucleotideCount: 1, lengthBefore: doc.length, lengthAfter: doc.length, lengthDelta: 0, coordinatesStable: true, affectedFeatureNames: [], summary: 'test' },
        expectedSequenceHash: hashBefore,
        status: 'pending' as const,
        createdAt: Date.now()
      };

      // Add corresponding activity event
      useActivityStore.getState().addEvent({
        toolName: 'seqcraft_edit_sequence',
        toolCategory: 'mutation',
        status: 'awaiting_approval',
        inputSummary: 'edit',
        callId: txId,
        transaction: tx
      });
      useActivityStore.getState().setPendingTransaction(tx);

      // Commit
      const commitRes = await useActivityStore.getState().commitPendingTransaction();
      expect(commitRes.success).toBe(true);

      const statusRes = await seqcraftGetTransactionStatusTool.execute({ transactionId: txId });
      expect(statusRes.ok).toBe(true);
      expect(statusRes.result.transaction.status).toBe('applied');
      expect(statusRes.result.transaction.appliedRevision).toBe(doc.version + 1);
      expect(typeof statusRes.result.transaction.appliedSequenceHash).toBe('string');
    });

    it('reports rejected status when rejected', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      const txId = 'tx_reject_test';
      const tx = {
        id: txId,
        documentId: doc.id,
        baseRevision: doc.version,
        baseSequenceHash: 'dummyhash'.padEnd(64, '0'),
        operation: { type: 'replace' as const, start0: 0, end0Exclusive: 1, replacement: 'A' },
        affectedRange: { start0: 0, end0Exclusive: 1 },
        beforeFragment: 'G',
        afterFragment: 'A',
        invariantReport: { passed: true, position1: 1, originalBase: 'G', mutatedBase: 'A', changedNucleotideCount: 1, lengthBefore: doc.length, lengthAfter: doc.length, lengthDelta: 0, coordinatesStable: true, affectedFeatureNames: [], summary: 'test' },
        expectedSequenceHash: 'dummyhash'.padEnd(64, '0'),
        status: 'pending' as const,
        createdAt: Date.now()
      };

      useActivityStore.getState().addEvent({
        toolName: 'seqcraft_edit_sequence',
        toolCategory: 'mutation',
        status: 'awaiting_approval',
        inputSummary: 'edit',
        callId: txId,
        transaction: tx
      });
      useActivityStore.getState().setPendingTransaction(tx);

      // Reject
      useActivityStore.getState().rejectPendingTransaction();

      const statusRes = await seqcraftGetTransactionStatusTool.execute({ transactionId: txId });
      expect(statusRes.ok).toBe(true);
      expect(statusRes.result.transaction.status).toBe('rejected');
    });

    it('double-commit protection is idempotent and returns success', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      useActivityStore.getState().setPendingTransaction({
        id: 'tx_idempotent',
        documentId: doc.id,
        baseRevision: doc.version,
        baseSequenceHash: 'deadbeef'.repeat(8),
        operation: { type: 'replace', start0: 0, end0Exclusive: 1, replacement: 'A' },
        affectedRange: { start0: 0, end0Exclusive: 1 },
        beforeFragment: 'G', afterFragment: 'A',
        invariantReport: { passed: true, position1: 1, originalBase: 'G', mutatedBase: 'A', changedNucleotideCount: 1, lengthBefore: doc.length, lengthAfter: doc.length, lengthDelta: 0, coordinatesStable: true, affectedFeatureNames: [], summary: 'test' },
        expectedSequenceHash: 'deadbeef'.repeat(8),
        status: 'applied',
        createdAt: Date.now()
      });

      const origVersion = doc.version;
      const result = await useActivityStore.getState().commitPendingTransaction();
      expect(result.success).toBe(true);

      const updated = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
      expect(updated.version).toBe(origVersion);
    });
  });

  describe('seqcraft_domesticate_sequence & seqcraft_edit_sequence', () => {
    it('domesticate_sequence returns structured candidates without modifying sequence', async () => {
      const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
      useWorkspaceStore.getState().addDocument(doc);
      useWorkspaceStore.getState().setActiveDocument(doc.id);

      const origSeq = doc.sequence!.raw;
      const res = await seqcraftDomesticateSequenceTool.execute({ enzymeId: 'BsaI', readingFrame: 1 });
      expect(res.ok).toBe(true);
      expect(Array.isArray(res.result.candidates)).toBe(true);
      if (res.result.candidates.length > 0) {
        const c = res.result.candidates[0];
        expect(typeof c.start1).toBe('number');
        expect(typeof c.end1).toBe('number');
        expect(typeof c.beforeSequence).toBe('string');
        expect(typeof c.afterSequence).toBe('string');
        expect(Array.isArray(c.affectedFeatureIds)).toBe(true);
        expect(Array.isArray(c.nucleotideChanges)).toBe(true);
        expect(Array.isArray(c.proteinEffects)).toBe(true);
        expect(typeof c.restrictionEffect).toBe('object');
        expect(c.restrictionEffect.enzyme).toBe('BsaI');
      }

      // Assert read-only: document unmutated
      expect(doc.sequence!.raw).toBe(origSeq);
    });
  });
});
