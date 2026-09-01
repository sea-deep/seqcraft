import { useWorkspaceStore } from '../state/workspace-store';
import { useActivityStore } from '../state/activity-store';
import { analyzeRestrictionSites, getUniqueCutters, getDoubleCutters } from '../scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../data/restriction-enzymes';
import { simulateRestrictionDigest } from '../scientific/digest';
import { analyzePrimerProperties } from '../scientific/primer-properties';
import { analyzePrimerBindings } from '../scientific/primer-binding';
import { simulatePCR, analyzePrimerPairProperties } from '../scientific/pcr';
import type { RestrictionEnzyme } from '../domain/restriction';
import { showRestrictionSite, showFeature, focusSequenceRegion } from '../application/navigation';
import { prepareRestrictionClone } from '../application/cloning';

const createError = (code: string, message: string, details?: any) => ({
  ok: false,
  error: { code, message, details }
});

const createSuccess = (result: any) => ({
  ok: true,
  result
});

const getActiveDocument = () => {
  const state = useWorkspaceStore.getState();
  const id = state.activeDocumentId;
  return id ? state.documents.find(d => d.id === id) || null : null;
};

const resolveEnzymes = (names: string[]): { found: RestrictionEnzyme[], notFound: string[] } => {
  const found: RestrictionEnzyme[] = [];
  const notFound: string[] = [];
  names.forEach(name => {
    const e = BUILTIN_ENZYMES.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (e) found.push(e);
    else notFound.push(name);
  });
  return { found, notFound };
};

export const getWebMCPContext = () => {
  if (typeof document !== 'undefined' && document.modelContext) {
    return document.modelContext;
  }
  return null;
};

const logActivity = (toolName: string, inputSummary: string, result: any, resultSummary: string) => {
  useActivityStore.getState().addEvent({
    toolName,
    inputSummary,
    status: result.ok ? 'success' : 'error',
    resultSummary: result.ok ? resultSummary : `Error: ${result.error.message}`
  });
  return result;
};

const wrapToolExecute = (toolName: string, inputSummaryFn: (input: any) => string, handler: (input: any) => any) => {
  return async (input: any) => {
    let parsedInput = input;
    if (typeof input === 'string') {
      try {
        parsedInput = JSON.parse(input);
      } catch(e) {}
    }
    let result;
    try {
      result = await handler(parsedInput);
    } catch (err: any) {
      result = createError("INTERNAL_ERROR", err.message || String(err));
    }
    return logActivity(toolName, inputSummaryFn(parsedInput), result, result.ok ? (result.result.summary || 'Success') : '');
  };
};

export const seqcraftGetActiveDocumentTool = {
  name: 'seqcraft_get_active_document',
  description: "Inspect the DNA document currently open in SeqCraft. Returns its name, sequence length, topology, annotations, active workspace view, and current user selection. Call this first when you need to understand the user's current SeqCraft context.",
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: wrapToolExecute('seqcraft_get_active_document', () => 'No input', () => {
    const doc = getActiveDocument();
    if (!doc) return createError('NO_ACTIVE_DOCUMENT', 'No active DNA document is open.');
    
    const state = useWorkspaceStore.getState();
    return createSuccess({
      summary: `Document: ${doc.name} (${doc.sequence.length} bp)`,
      documentId: doc.id,
      name: doc.name,
      lengthBp: doc.sequence.length,
      topology: doc.topology,
      alphabet: doc.alphabet,
      featureCount: doc.features.length,
      activeView: state.activeView,
      selectedFeatureId: state.selectedFeatureId,
      selectedRestrictionSiteId: state.selectedRestrictionSiteId,
      currentSelection: state.selection ? {
        start1: state.selection.start0 + 1,
        end1: state.selection.end0Exclusive
      } : null
    });
  })
};

export const seqcraftAnalyzeRestrictionSitesTool = {
  name: 'seqcraft_analyze_restriction_sites',
  description: "Find restriction-enzyme recognition and cleavage sites in the DNA document currently open in SeqCraft. Use this to answer where enzymes such as EcoRI, BamHI, HindIII, or other built-in enzymes cut the active sequence.",
  inputSchema: {
    type: 'object',
    properties: {
      enzymeNames: { 
        type: 'array', 
        items: { type: 'string' },
        minItems: 1,
        description: "Restriction enzyme names to analyze, for example EcoRI, BamHI, or HindIII."
      },
      cutterFilter: { 
        type: 'string', 
        enum: ['all', 'unique', 'double'],
        description: "Filter results by cutter frequency (all sites, unique cutters only, or double cutters only)."
      }
    },
    required: ['enzymeNames'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: wrapToolExecute(
    'seqcraft_analyze_restriction_sites',
    (i) => `Enzymes: ${i.enzymeNames?.join(', ')}`,
    (input: { enzymeNames: string[], cutterFilter?: 'all' | 'unique' | 'double' }) => {
      const doc = getActiveDocument();
      if (!doc) return createError('NO_ACTIVE_DOCUMENT', 'No active DNA document is open.');
      
      const { found, notFound } = resolveEnzymes(input.enzymeNames);
      if (notFound.length > 0) {
        return createError('UNKNOWN_ENZYME', `Unknown enzymes: ${notFound.join(', ')}`, {
          availableBuiltinEnzymes: BUILTIN_ENZYMES.map(e => e.name)
        });
      }

      let sites = analyzeRestrictionSites(doc.sequence.raw, doc.topology, found);
      if (input.cutterFilter === 'unique') sites = getUniqueCutters(sites);
      else if (input.cutterFilter === 'double') sites = getDoubleCutters(sites);

      return createSuccess({
        summary: `Found ${sites.length} sites`,
        document: { id: doc.id, name: doc.name, topology: doc.topology, lengthBp: doc.sequence.length },
        analyzedEnzymes: found.map(e => e.name),
        siteCount: sites.length,
        sites: sites.map(s => ({
          enzymeName: s.enzymeName,
          recognitionSequence: s.recognitionSequence,
          start1: s.start0 + 1,
          end1: s.end0Exclusive,
          forwardCut1: s.forwardCut0,
          reverseCut1: s.reverseCut0,
          endType: found.find(e => e.id === s.enzymeId)!.forwardCutOffset < found.find(e => e.id === s.enzymeId)!.reverseCutOffset ? "5' overhang" : (found.find(e => e.id === s.enzymeId)!.forwardCutOffset > found.find(e => e.id === s.enzymeId)!.reverseCutOffset ? "3' overhang" : "blunt")
        }))
      });
    }
  )
};

export const seqcraftSimulateDigestTool = {
  name: 'seqcraft_simulate_digest',
  description: "Simulate a restriction digest of the DNA document currently open in SeqCraft using one or more built-in restriction enzymes. Returns physical cut positions, fragment sizes, fragment source ranges, and sticky or blunt end chemistry.",
  inputSchema: {
    type: 'object',
    properties: {
      enzymeNames: { 
        type: 'array', 
        items: { type: 'string' },
        minItems: 1,
        description: "Restriction enzyme names to use for the digest, for example EcoRI, BamHI, or HindIII."
      }
    },
    required: ['enzymeNames'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: wrapToolExecute(
    'seqcraft_simulate_digest',
    (i) => `Digest with ${i.enzymeNames?.join(', ')}`,
    (input: { enzymeNames: string[] }) => {
      const doc = getActiveDocument();
      if (!doc) return createError('NO_ACTIVE_DOCUMENT', 'No active DNA document is open.');
      
      const { found, notFound } = resolveEnzymes(input.enzymeNames);
      if (notFound.length > 0) {
        return createError('UNKNOWN_ENZYME', `Unknown enzymes: ${notFound.join(', ')}`, {
          availableBuiltinEnzymes: BUILTIN_ENZYMES.map(e => e.name)
        });
      }

      const sites = analyzeRestrictionSites(doc.sequence.raw, doc.topology, found);
      const digest = simulateRestrictionDigest({
        sequence: doc.sequence.raw,
        topology: doc.topology,
        restrictionSites: sites,
        selectedEnzymeIds: found.map(e => e.id)
      });

      const enzymesWithNoSites = found.filter(e => !sites.some(s => s.enzymeId === e.id)).map(e => e.name);

      return createSuccess({
        summary: `${digest.fragments.length} fragments produced`,
        documentName: doc.name,
        topology: doc.topology,
        enzymes: found.map(e => e.name),
        cutCount: digest.cuts.length,
        fragmentCount: digest.fragments.length,
        enzymesWithNoSites,
        cuts: digest.cuts.map(c => ({
          enzymeNames: c.sites.map(s => s.enzymeName),
          coordinate1: c.coordinate0
        })),
        fragments: digest.fragments.map(f => ({
          id: f.id,
          lengthBp: f.lengthBp,
          sourceRanges: f.segments.map(s => ({ start1: s.start0 + 1, end1: s.end0Exclusive })),
          leftEnd: f.leftEnd ? {
            type: f.leftEnd.type,
            overhangSequence: f.leftEnd.sequence,
            overhangLength: f.leftEnd.overhangLength,
            protrudingStrand: f.leftEnd.protrudingStrand
          } : null,
          rightEnd: f.rightEnd ? {
            type: f.rightEnd.type,
            overhangSequence: f.rightEnd.sequence,
            overhangLength: f.rightEnd.overhangLength,
            protrudingStrand: f.rightEnd.protrudingStrand
          } : null
        }))
      });
    }
  )
};

export const seqcraftAnalyzePrimerTool = {
  name: 'seqcraft_analyze_primer',
  description: "Analyze a DNA primer against the document currently open in SeqCraft. Returns primer properties including GC content and melting temperature plus every exact forward or reverse binding location on the active template.",
  inputSchema: {
    type: 'object',
    properties: {
      sequence: { type: 'string', description: "The raw nucleotide sequence of the primer (5' to 3')." },
      name: { type: 'string', description: "An optional name for the primer." }
    },
    required: ['sequence'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: wrapToolExecute(
    'seqcraft_analyze_primer',
    (i) => `Primer: ${i.sequence}`,
    (input: { name?: string, sequence: string }) => {
      const doc = getActiveDocument();
      if (!doc) return createError('NO_ACTIVE_DOCUMENT', 'No active DNA document is open.');
      
      if (!input.sequence) return createError('INVALID_PRIMER', 'Primer sequence cannot be empty.');

      const primer = { id: 'ephemeral', name: input.name || 'query', sequence: input.sequence };
      const props = analyzePrimerProperties(input.sequence);
      const bindings = analyzePrimerBindings(doc.sequence.raw, doc.topology, primer);

      return createSuccess({
        summary: `Tm: ${props.meltingTemperature.toFixed(1)}°C, Bindings: ${bindings.length}`,
        primer: { sequence: input.sequence, length: props.length, gcPercent: props.gcPercent, tm: props.meltingTemperature, molecularWeight: props.molecularWeight },
        bindingCount: bindings.length,
        bindings: bindings.map(b => ({
          orientation: b.orientation,
          start1: b.start0 + 1,
          end1: b.end0Exclusive,
          fivePrime1: b.fivePrimeBase0 + 1,
          threePrime1: b.threePrimeBase0 + 1,
          extensionDirection: b.extensionDirection,
          wrapsOrigin: b.wrapsOrigin
        }))
      });
    }
  )
};

export const seqcraftSimulatePcrTool = {
  name: 'seqcraft_simulate_pcr',
  description: "Simulate PCR on the DNA document currently open in SeqCraft using two primer sequences. Returns exact primer bindings and all possible amplicons, including products that cross the origin of a circular plasmid.",
  inputSchema: {
    type: 'object',
    properties: {
      forwardPrimerSequence: { type: 'string', description: "The raw nucleotide sequence of the forward primer (5' to 3')." },
      reversePrimerSequence: { type: 'string', description: "The raw nucleotide sequence of the reverse primer (5' to 3')." },
      forwardPrimerName: { type: 'string', description: "An optional name for the forward primer." },
      reversePrimerName: { type: 'string', description: "An optional name for the reverse primer." }
    },
    required: ['forwardPrimerSequence', 'reversePrimerSequence'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: wrapToolExecute(
    'seqcraft_simulate_pcr',
    () => `PCR simulation`,
    (input: { forwardPrimerSequence: string, reversePrimerSequence: string, forwardPrimerName?: string, reversePrimerName?: string }) => {
      const doc = getActiveDocument();
      if (!doc) return createError('NO_ACTIVE_DOCUMENT', 'No active DNA document is open.');
      if (!input.forwardPrimerSequence || !input.reversePrimerSequence) return createError('INVALID_PRIMER', 'Primer sequences cannot be empty.');
      
      const fwdPrimer = { id: 'fwd', name: input.forwardPrimerName || 'forward', sequence: input.forwardPrimerSequence };
      const revPrimer = { id: 'rev', name: input.reversePrimerName || 'reverse', sequence: input.reversePrimerSequence };
      
      const result = simulatePCR({
        sequence: doc.sequence.raw,
        topology: doc.topology,
        forwardPrimer: fwdPrimer,
        reversePrimer: revPrimer
      });

      const pairProps = analyzePrimerPairProperties(input.forwardPrimerSequence, input.reversePrimerSequence);
      const MAX_SEQUENCE_LEN = 50;

      return createSuccess({
        summary: `${result.products.length} amplicons`,
        template: { documentName: doc.name, topology: doc.topology },
        forwardPrimerSummary: { length: input.forwardPrimerSequence.length, tm: pairProps.forwardTm, gcPercent: pairProps.forwardGcPercent },
        reversePrimerSummary: { length: input.reversePrimerSequence.length, tm: pairProps.reverseTm, gcPercent: pairProps.reverseGcPercent },
        tmDifference: pairProps.tmDifference,
        productCount: result.products.length,
        products: result.products.map(p => {
          let compactSeq: string | { length: number, prefix: string, suffix: string } = p.sequence;
          if (p.sequence.length > MAX_SEQUENCE_LEN) {
            compactSeq = {
              length: p.sequence.length,
              prefix: p.sequence.slice(0, 20),
              suffix: p.sequence.slice(-20)
            };
          }
          return {
            id: p.id,
            lengthBp: p.lengthBp,
            ranges: p.segments.map(s => ({ start1: s.start0 + 1, end1: s.end0Exclusive })),
            wrapsOrigin: p.wrapsOrigin,
            sequence: compactSeq,
            forwardBinding: { start1: p.forwardBinding.start0 + 1, end1: p.forwardBinding.end0Exclusive },
            reverseBinding: { start1: p.reverseBinding.start0 + 1, end1: p.reverseBinding.end0Exclusive }
          };
        })
      });
    }
  )
};

// ─── Navigation tools (readOnlyHint: false — they mutate UI state) ─────

export const seqcraftFocusRegionTool = {
  name: 'seqcraft_focus_region',
  description: "Focus a nucleotide region in the DNA document currently open in SeqCraft. Updates the user's visible SeqCraft selection and optionally switches between the sequence and 3D map views. Coordinates are 1-based and inclusive; circular regions may cross the sequence origin.",
  inputSchema: {
    type: 'object',
    properties: {
      start1: {
        type: 'integer',
        minimum: 1,
        description: 'First nucleotide coordinate using 1-based SeqCraft display coordinates.'
      },
      end1: {
        type: 'integer',
        minimum: 1,
        description: 'Last nucleotide coordinate using 1-based inclusive SeqCraft display coordinates.'
      },
      view: {
        type: 'string',
        enum: ['sequence', 'map'],
        description: 'Optional SeqCraft workspace view to display after focusing the region.'
      }
    },
    required: ['start1', 'end1'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: wrapToolExecute(
    'seqcraft_focus_region',
    (i) => `${i.start1}–${i.end1}${i.view ? ' · ' + i.view : ''}`,
    (input: { start1: number, end1: number, view?: 'sequence' | 'map' }) => {
      return focusSequenceRegion({
        start1: input.start1,
        end1: input.end1,
        preferredView: input.view,
      });
    }
  )
};

export const seqcraftShowRestrictionSiteTool = {
  name: 'seqcraft_show_restriction_site',
  description: "Show a restriction-enzyme cut site in the user's SeqCraft workspace. Selects the requested restriction site, opens it through SeqCraft's shared inspector state, and can switch to the 3D plasmid map so the selected cut becomes visually focused.",
  inputSchema: {
    type: 'object',
    properties: {
      enzymeName: {
        type: 'string',
        description: 'Restriction enzyme name, for example EcoRI, BamHI, or HindIII.'
      },
      occurrence: {
        type: 'integer',
        minimum: 1,
        description: 'Which site to show when the enzyme cuts multiple times. Uses deterministic 1-based occurrence ordering.'
      },
      view: {
        type: 'string',
        enum: ['sequence', 'map'],
        description: 'SeqCraft view to display after selecting the site. Defaults to map.'
      }
    },
    required: ['enzymeName'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: wrapToolExecute(
    'seqcraft_show_restriction_site',
    (i) => `${i.enzymeName}${i.occurrence ? ' · occurrence ' + i.occurrence : ''}`,
    (input: { enzymeName: string, occurrence?: number, view?: 'sequence' | 'map' }) => {
      return showRestrictionSite({
        enzymeName: input.enzymeName,
        occurrence: input.occurrence,
        view: input.view,
      });
    }
  )
};

export const seqcraftShowFeatureTool = {
  name: 'seqcraft_show_feature',
  description: "Show an annotated biological feature in the user's SeqCraft workspace. Selects a feature such as AmpR, an origin, promoter, CDS, or gene and optionally switches to the sequence or 3D plasmid view so the human can inspect it.",
  inputSchema: {
    type: 'object',
    properties: {
      featureId: {
        type: 'string',
        description: 'Exact SeqCraft feature ID when already known.'
      },
      featureName: {
        type: 'string',
        description: 'Exact feature name, matched case-insensitively, for example AmpR.'
      },
      occurrence: {
        type: 'integer',
        minimum: 1,
        description: '1-based occurrence when multiple features have the same name.'
      },
      view: {
        type: 'string',
        enum: ['sequence', 'map'],
        description: 'SeqCraft view to display after selecting the feature. Defaults to map.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: wrapToolExecute(
    'seqcraft_show_feature',
    (i) => `${i.featureName || i.featureId || 'unknown'}`,
    (input: { featureId?: string, featureName?: string, occurrence?: number, view?: 'sequence' | 'map' }) => {
      return showFeature({
        featureId: input.featureId,
        featureName: input.featureName,
        occurrence: input.occurrence,
      });
    }
  )
};

export const seqcraftListDocumentsTool = {
  name: 'seqcraft_list_documents',
  description: 'List the DNA documents currently open in SeqCraft. Returns document IDs, names, sequence lengths, topology, and which document is active. Use this before workflows that operate on more than one molecule, such as restriction cloning.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: wrapToolExecute(
    'seqcraft_list_documents',
    () => 'Requested document list',
    async () => {
      const store = useWorkspaceStore.getState();
      const documents = store.documents.map(d => ({
        id: d.id,
        name: d.name,
        lengthBp: d.sequence.length,
        topology: d.topology,
        active: d.id === store.activeDocumentId
      }));
      return createSuccess({ documents });
    }
  )
};

export const seqcraftPrepareRestrictionCloneTool = {
  name: 'seqcraft_prepare_restriction_clone',
  description: 'Prepare a restriction-enzyme cloning proposal using a circular vector and donor insert already open in SeqCraft. The tool analyzes digests, compatible ends, insert orientation, recombinant length, and transferred annotations, then opens a human approval preview. It stages the proposal and does not create the recombinant document until the user approves it in SeqCraft.',
  inputSchema: {
    type: 'object',
    properties: {
      vectorDocumentId: { type: 'string', description: 'Document ID of the circular vector. Defaults to the currently active document.' },
      insertDocumentId: { type: 'string', description: 'Document ID of the donor molecule containing the insert.' },
      enzymeNames: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 2, description: 'One or two built-in restriction enzymes, for example EcoRI and HindIII.' },
      vectorFragmentId: { type: 'string', description: 'Optional explicit vector digest fragment ID. The largest fragment is selected automatically when omitted.' },
      insertFragmentId: { type: 'string', description: 'Optional explicit donor digest fragment ID. An internal restriction-bounded fragment is selected automatically when omitted.' }
    },
    required: ['insertDocumentId', 'enzymeNames'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: wrapToolExecute(
    'seqcraft_prepare_restriction_clone',
    (i: any) => `Cloning insert ${i.insertDocumentId} with ${i.enzymeNames.join(', ')}`,
    async (input: any) => {
      const res = prepareRestrictionClone(input);
      if (!res.ok) return createError('PREPARATION_FAILED', res.error || 'Failed to prepare clone', res.details);
      
      const prop = res.proposal!;
      const candidate = prop.candidates[0];

      return createSuccess({
        proposalId: prop.proposalId,
        vectorSummary: { name: prop.vectorDocumentName, fragmentId: prop.vectorFragmentId, backboneLengthBp: prop.vectorBackboneLengthBp },
        insertSummary: { name: prop.insertDocumentName, fragmentId: prop.insertFragmentId, insertLengthBp: prop.insertLengthBp },
        enzymes: prop.enzymeNames,
        selectedFragments: { vector: prop.vectorFragmentId, insert: prop.insertFragmentId },
        orientationCandidates: prop.candidates.map(c => c.orientation),
        junctionCompatibility: { junction1: candidate.junction1.isCompatible, junction2: candidate.junction2.isCompatible },
        recombinantCandidateLengths: prop.candidates.map(c => c.recombinantLengthBp),
        warnings: prop.warnings,
        requiresHumanApproval: true,
        summary: `Prepared ${candidate.recombinantLengthBp} bp directional clone · awaiting approval`
      });
    }
  )
};

export async function registerSeqCraftTools(targetContext?: any, signal?: AbortSignal): Promise<void> {
  const ctx = targetContext || getWebMCPContext();
  if (!ctx) return;

  const tools = [
    seqcraftAnalyzePrimerTool,
    seqcraftAnalyzeRestrictionSitesTool,
    seqcraftSimulateDigestTool,
    seqcraftSimulatePcrTool,
    seqcraftGetActiveDocumentTool,
    seqcraftFocusRegionTool,
    seqcraftShowRestrictionSiteTool,
    seqcraftShowFeatureTool,
    seqcraftListDocumentsTool,
    seqcraftPrepareRestrictionCloneTool
  ];

  for (const t of tools) {
    if (signal?.aborted) return;
    await ctx.registerTool(
      {
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: t.annotations,
        execute: async (input: unknown) => {
          if (signal?.aborted) return JSON.stringify({ isError: true, content: [{ type: 'text', text: 'Aborted' }] });
          return await t.execute(input);
        }
      },
      { signal }
    );
  }
}

if (typeof window !== 'undefined') {
  (window as any).__SEQCRAFT_WEBMCP__ = {
    status: async () => {
      const ctx = getWebMCPContext();
      const base = {
        secureContext: window.isSecureContext,
        originAgentCluster: (window as any).originAgentCluster,
        modelContextAvailable: Boolean(ctx)
      };
      
      if (!ctx) return { available: false, registered: false, error: 'document.modelContext not found', ...base };
      try {
        const tools = await ctx.getTools();
        const seqTools = tools.filter(t => t.name.startsWith('seqcraft_'));
        return { available: true, registered: seqTools.length > 0, ...base };
      } catch (e: any) {
        return { available: true, registered: false, error: e.message, ...base };
      }
    },
    listTools: async () => {
      const ctx = getWebMCPContext();
      if (!ctx) return [];
      const tools = await ctx.getTools();
      return tools
        .filter(t => t.name.startsWith('seqcraft_'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: t.annotations
        }));
    }
  };
}
