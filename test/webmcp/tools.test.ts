import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  registerSeqCraftTools, 
  seqcraftGetCapabilitiesTool,
  seqcraftGetActiveDocumentTool,
  seqcraftAnalyzeRestrictionSitesTool,
  seqcraftSimulateDigestTool,
  seqcraftAnalyzePrimerTool,
  seqcraftSimulatePcrTool,
  seqcraftFocusRegionTool,
  seqcraftShowRestrictionSiteTool,
  seqcraftShowFeatureTool
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

  it('registers exactly 24 tools asynchronously', async () => {
    const controller = new AbortController();
    await registerSeqCraftTools(mockMcp, controller.signal);
    
    expect(mockMcp.registerTool).toHaveBeenCalledTimes(24);
    
    const expectedNames = [
      'seqcraft_analyze_primer',
      'seqcraft_analyze_restriction_sites',
      'seqcraft_focus_region',
      'seqcraft_get_active_document',
      'seqcraft_get_capabilities',
      'seqcraft_show_feature',
      'seqcraft_show_restriction_site',
      'seqcraft_simulate_digest',
      'seqcraft_simulate_pcr',
      'seqcraft_list_documents',
      'seqcraft_prepare_restriction_clone',
      'seqcraft_find_orfs',
      'seqcraft_detect_known_features',
      'seqcraft_list_features',
      'seqcraft_list_primers',
      'seqcraft_compare_documents',
      'seqcraft_propose_annotation',
      'seqcraft_generate_opentrons_protocol',
      'seqcraft_find_crispr_targets',
      'seqcraft_simulate_golden_gate',
      'seqcraft_domesticate_sequence',
      'seqcraft_screen_biosecurity',
      'seqcraft_edit_sequence',
      'seqcraft_rotate_origin',
    ].sort();
    
    const actualNames = [...registeredTools.keys()].sort();
    expect(actualNames).toEqual(expectedNames);
  });

  it('scientific tools have readOnlyHint=true, action tools have readOnlyHint=false', async () => {
    await registerSeqCraftTools(mockMcp, new AbortController().signal);
    
    // Scientific (read-only)
    const readOnlyTools = [
      'seqcraft_get_capabilities',
      'seqcraft_get_active_document',
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
    expect(calls.length).toBe(24);
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
    expect(res.result.status).toBe('COMPLIANT');
    expect(res.result.summary).toContain('Screening passed');
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

    expect(res.ok).toBe(false);
    expect(res.isError).toBe(true);
    expect(res.error.code).toBe('HUMAN_APPROVAL_REQUIRED');

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

    expect(res.ok).toBe(false);
    expect(res.isError).toBe(true);
    expect(res.error.code).toBe('HUMAN_APPROVAL_REQUIRED');

    const updated = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
    expect(updated.version).toBe(origVersion);
  });
});
