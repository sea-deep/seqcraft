import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { generateId } from '../../utils/id';
import { computeSequenceSha256 } from '../../utils/sequence-hash';
import { getMemorySequence } from '../../utils/document-utils';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { BUILTIN_ENZYMES, findEnzyme, getEnzymeSuggestions } from '../../data/restriction-enzymes';
import { simulateRestrictionDigest } from '../../scientific/digest';
import { showRestrictionSite } from '../../application/navigation';
import { TYPE_IIS_ENZYMES, assembleGoldenGate, domesticateSequence } from '../../scientific/golden-gate';
import { prepareRestrictionClone } from '../../application/cloning';
import { evaluateTransactionInvariants } from '../../scientific/transaction-invariants';
import type { SequenceTransaction } from '../../domain/sequence-transaction';
import type { SequenceEditAction } from '../../scientific/sequence-editing';
import type { RestrictionEnzyme } from '../../domain/restriction';

// In-memory cache of computed candidate proposals for revision-safe staging
const candidateCache = new Map<string, {
  candidateId: string;
  documentId: string;
  baseRevision: number;
  baseSequenceHash: string;
  start1: number;
  end1: number;
  beforeSequence: string;
  afterSequence: string;
  summary: string;
}>();

export const seqcraftAnalyzeRestrictionSitesTool: SeqCraftToolDefinition = {
  name: 'seqcraft_analyze_restriction_sites',
  title: 'Analyze Restriction Sites',
  description: 'Search for recognition and cut sites of standard restriction enzymes (Type II and Type IIS, e.g. EcoRI, BamHI, BsaI, BsmBI, NotI, HindIII) on the target molecule. Returns 1-based coordinates [start1, end1], forwardCut1, reverseCut1, and overhang types.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      },
      enzymeNames: {
        type: 'array',
        items: { type: 'string' },
        description: 'Enzyme names to search for (e.g. ["BsaI", "EcoRI", "BamHI"]).'
      }
    },
    required: ['enzymeNames'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { enzymeNames: string[]; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const resolved: any[] = [];
    const unknown: string[] = [];

    for (const name of input.enzymeNames) {
      const e = findEnzyme(name);
      if (e) resolved.push(e);
      else unknown.push(name);
    }

    if (unknown.length > 0) {
      const suggestions = getEnzymeSuggestions(unknown[0]);
      return createError('UNKNOWN_ENZYME', `Unknown enzyme(s): ${unknown.join(', ')}.`, suggestions.length > 0 ? `Did you mean: ${suggestions.join(', ')}?` : `Supported enzymes include: EcoRI, BamHI, BsaI, BsmBI, NotI, SalI, etc.`, {
        unknownEnzymes: unknown,
        suggestions,
        availableBuiltinEnzymes: BUILTIN_ENZYMES.map(e => e.name)
      });
    }

    const raw = doc.sequence ? getMemorySequence(doc).raw : '';
    const sites = analyzeRestrictionSites(raw, doc.topology, resolved);
    const formatted = sites.map(s => {
      const enz = resolved.find(e => e.id === s.enzymeId);
      const overhang = enz?.overhang ?? (s.forwardCut0 === s.reverseCut0 ? 0 : 4);
      return {
        id: s.id,
        enzymeId: s.enzymeId,
        enzymeName: s.enzymeName,
        recognitionSequence: s.recognitionSequence,
        start1: s.start0 + 1,
        end1: s.end0Exclusive,
        forwardCut1: s.forwardCut0,
        reverseCut1: s.reverseCut0,
        strand: s.strand === -1 ? '-' : '+',
        endType: overhang === 0 ? 'blunt' : overhang > 0 ? "5' overhang" : "3' overhang"
      };
    });

    return createSuccess({
      documentId: doc.id,
      documentName: doc.name,
      siteCount: formatted.length,
      sitesCount: formatted.length,
      sites: formatted,
      restrictionSites: formatted
    });
  }
};

export const seqcraftShowRestrictionSiteTool: SeqCraftToolDefinition = {
  name: 'seqcraft_show_restriction_site',
  title: 'Show Restriction Site',
  description: 'Highlight a restriction enzyme cut site on the map and editor view.',
  effectClass: 'navigation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      },
      siteId: {
        type: 'string',
        description: 'Restriction site identifier.'
      },
      enzymeName: {
        type: 'string',
        description: 'Enzyme name (e.g. EcoRI).'
      },
      occurrence: {
        type: 'integer',
        minimum: 1,
        description: '1-based occurrence index for the enzyme (default: 1).'
      },
      view: {
        type: 'string',
        enum: ['map', 'sequence'],
        description: 'Target editor view mode.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (input: { siteId?: string; enzymeName?: string; occurrence?: number; view?: 'map' | 'sequence'; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('NO_ACTIVE_DOCUMENT', 'Target document not found.', 'Use seqcraft_list_documents to inspect available documents.');
    }

    const enzymeQuery = input.enzymeName || (input as any).enzyme;
    const view = input.view || (input as any).preferredView || 'map';
    const occurrence = input.occurrence || 1;

    if (enzymeQuery && (!input.documentId || input.documentId === ctx.workspace.activeDocumentId)) {
      const navRes = showRestrictionSite({ enzymeName: enzymeQuery, occurrence, view });
      if (!navRes.ok) {
        return createError(navRes.error.code, navRes.error.message, undefined, navRes.error.details);
      }
      return createSuccess({
        status: 'applied',
        documentId: doc.id,
        siteId: navRes.result.selectedRestrictionSiteId,
        ...navRes.result
      });
    }

    let targetSiteId = input.siteId || (input as any).restrictionSiteId;
    const raw = doc.sequence ? getMemorySequence(doc).raw : '';
    const allSites = analyzeRestrictionSites(raw, doc.topology, BUILTIN_ENZYMES);

    if (!targetSiteId && enzymeQuery) {
      const e = findEnzyme(enzymeQuery);
      if (e) {
        const sites = allSites.filter(s => s.enzymeId === e.id);
        if (sites.length >= occurrence) {
          targetSiteId = sites[occurrence - 1].id;
        }
      }
    }

    const site = allSites.find(s => s.id === targetSiteId);
    if (!site) {
      return createError('SITE_NOT_FOUND', `Could not find restriction site '${enzymeQuery || input.siteId}' on document '${doc.name}'.`);
    }

    if (view && (view === 'map' || view === 'sequence')) {
      ctx.workspace.setActiveView(view);
    }

    ctx.workspace.selectRestrictionSite(site.id);

    return createSuccess({
      status: 'applied',
      documentId: doc.id,
      siteId: site.id,
      selectedRestrictionSiteId: site.id,
      enzymeName: site.enzymeName,
      recognitionSequence: site.recognitionSequence,
      start1: site.start0 + 1,
      end1: site.end0Exclusive,
      forwardCut1: site.forwardCut0,
      reverseCut1: site.reverseCut0,
      activeView: ctx.workspace.activeView
    });
  }
};

export const seqcraftSimulateDigestTool: SeqCraftToolDefinition = {
  name: 'seqcraft_simulate_digest',
  title: 'Simulate Digest',
  description: 'Simulate single or multi-enzyme restriction digestion on a circular plasmid or linear DNA. Returns predicted fragment sizes, fragment sequences, and terminal overhang types.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      },
      enzymeNames: {
        type: 'array',
        items: { type: 'string' },
        description: 'Enzyme names for single or double digest.'
      }
    },
    required: ['enzymeNames'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { enzymeNames: string[]; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const resolved: any[] = [];
    for (const name of input.enzymeNames) {
      const e = findEnzyme(name);
      if (e) resolved.push(e);
      else return createError('UNKNOWN_ENZYME', `Unknown enzyme '${name}'.`);
    }

    const raw = doc.sequence ? getMemorySequence(doc).raw : '';
    const sites = analyzeRestrictionSites(raw, doc.topology, resolved);
    const result = simulateRestrictionDigest({
      sequence: raw,
      topology: doc.topology,
      restrictionSites: sites,
      selectedEnzymeIds: resolved.map(e => e.id)
    });
    const fragments = result.fragments.map((f, i) => {
      const spansOrigin = f.segments.length > 1;
      const start1 = (f.segments[0]?.start0 ?? 0) + 1;
      const end1 = spansOrigin
        ? f.segments[f.segments.length - 1].end0Exclusive
        : (f.segments[0]?.end0Exclusive ?? f.lengthBp);

      return {
        fragmentIndex: i + 1,
        lengthBp: f.lengthBp,
        start1,
        end1,
        spansOrigin,
        segments: f.segments.map(s => ({
          start1: s.start0 + 1,
          end1: s.end0Exclusive
        })),
        leftEnd: f.leftEnd,
        rightEnd: f.rightEnd
      };
    });

    return createSuccess({
      documentName: doc.name,
      enzymes: input.enzymeNames,
      fragmentCount: fragments.length,
      fragments
    });
  }
};

export const seqcraftSimulateGoldenGateTool: SeqCraftToolDefinition = {
  name: 'seqcraft_simulate_golden_gate',
  title: 'Simulate Golden Gate',
  description: 'Simulate Golden Gate multi-fragment assembly using Type IIS restriction enzymes (e.g. BsaI, BsmBI, AarI). Validates compatible overhang pairs, checks junction fidelity, and returns the assembled construct.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of document IDs participating in the assembly in order.'
      },
      enzymeName: {
        type: 'string',
        enum: ['BsaI', 'BsmBI', 'BbsI', 'AarI', 'SapI', 'PaqCI', 'Esp3I'],
        description: 'Type IIS enzyme driving the assembly (default: BsaI).'
      }
    },
    required: ['documentIds'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { documentIds: string[]; enzymeName?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const docIds = input.documentIds || (input as any).partDocumentIds;
    const enzyme = input.enzymeName || (input as any).enzymeId || 'BsaI';
    const docs: any[] = [];

    if (!docIds || !Array.isArray(docIds)) {
      return createError('INVALID_INPUT', 'Golden Gate simulation requires documentIds or partDocumentIds array.');
    }

    for (const id of docIds) {
      const d = ctx.workspace.documents.find(item => item.id === id);
      if (!d) return createError('DOCUMENT_NOT_FOUND', `Document '${id}' not found.`);
      docs.push(d);
    }

    const resolvedEnzyme = TYPE_IIS_ENZYMES.find(
      e => e.name.toLowerCase() === enzyme.toLowerCase() || e.id.toLowerCase() === enzyme.toLowerCase()
    );
    if (!resolvedEnzyme) {
      return createError('UNKNOWN_ENZYME', `Unknown or unsupported Type IIS enzyme '${enzyme}'.`);
    }

    const parts = docs.map(d => ({
      id: d.id,
      name: d.name,
      sequence: getMemorySequence(d).raw,
      features: d.features
    }));

    const res = assembleGoldenGate(parts, resolvedEnzyme);
    if (!res.success) {
      return createError('ASSEMBLY_FAILED', res.errorMessage || 'Golden Gate assembly could not find compatible overhangs or failed validation.');
    }

    return createSuccess({
      success: true,
      enzyme: resolvedEnzyme.name,
      assembledLengthBp: res.recombinantSequence?.length || 0,
      junctions: res.junctions || []
    });
  }
};

export const seqcraftDomesticateSequenceTool: SeqCraftToolDefinition = {
  name: 'seqcraft_domesticate_sequence',
  title: 'Domesticate Sequence',
  description: 'Scan a sequence for internal Type IIS or standard restriction sites and return revision-bound synonymous mutation candidates to eliminate internal cut sites without altering protein translation. Follow up with seqcraft_stage_domestication_candidate to stage a proposal for human review.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Target document ID. If omitted, uses active document.'
      },
      enzymeId: {
        type: 'string',
        description: 'Restriction enzyme name to eliminate (e.g. "BsaI", "BsmBI", "EcoRI").'
      }
    },
    required: ['enzymeId'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: async (input: { enzymeId: string; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const rawSeq = doc.sequence ? getMemorySequence(doc).raw : '';
    const hash = await computeSequenceSha256(rawSeq);

    const enzymeQuery = input.enzymeId || (input as any).enzymeName;
    if (!enzymeQuery) {
      return createError('INVALID_INPUT', 'Missing enzymeId parameter.');
    }

    let typeIISEnzyme = TYPE_IIS_ENZYMES.find(e => e.name.toLowerCase() === enzymeQuery.toLowerCase() || e.id.toLowerCase() === enzymeQuery.toLowerCase());
    if (!typeIISEnzyme) {
      const std = findEnzyme(enzymeQuery);
      if (std) {
        const ovhLen = Math.abs(std.reverseCutOffset - std.forwardCutOffset);
        typeIISEnzyme = {
          id: std.id,
          name: std.name,
          recognitionSequence: std.recognitionSequence,
          topCutOffset: std.forwardCutOffset,
          bottomCutOffset: std.reverseCutOffset,
          overhangLength: ovhLen,
          overhangPolarity: std.reverseCutOffset >= std.forwardCutOffset ? '5prime' : '3prime'
        };
      } else {
        return createError('UNKNOWN_ENZYME', `Unknown enzyme '${input.enzymeId}'.`);
      }
    }

    const result = domesticateSequence(rawSeq, typeIISEnzyme);
    const reEnzyme: RestrictionEnzyme = {
      id: typeIISEnzyme.id,
      name: typeIISEnzyme.name,
      recognitionSequence: typeIISEnzyme.recognitionSequence,
      forwardCutOffset: typeIISEnzyme.topCutOffset,
      reverseCutOffset: typeIISEnzyme.bottomCutOffset,
      overhangLength: typeIISEnzyme.overhangLength,
      overhangPolarity: typeIISEnzyme.overhangPolarity
    };
    const totalSitesBefore = analyzeRestrictionSites(rawSeq, doc.topology, [reEnzyme]).length;

    const formattedCandidates = result.mutations.map((cand, idx) => {
      const candidateId = `dom_${doc.id.slice(0, 4)}_${idx + 1}`;
      const start1 = cand.position1;
      const end1 = cand.position1;
      const pos0 = cand.position1 - 1;
      const beforeSeq = cand.originalBase;
      const afterSeq = cand.mutatedBase;

      // Compute actual site count after this specific candidate mutation
      const candidateSeq = rawSeq.slice(0, pos0) + afterSeq + rawSeq.slice(pos0 + 1);
      const totalSitesAfter = analyzeRestrictionSites(candidateSeq, doc.topology, [reEnzyme]).length;

      // Derive overlapping features and protein consequences
      const affectedFeatures = doc.features.filter(f =>
        f.segments.some(s => s.start0 <= pos0 && s.end0Exclusive > pos0)
      );
      const affectedFeatureIds = affectedFeatures.map(f => f.id);

      const proteinEffects: Array<{
        featureId: string;
        featureName: string;
        aminoAcidBefore: string;
        aminoAcidAfter: string;
        codonBefore: string;
        codonAfter: string;
        isSynonymous: boolean;
        description: string;
      }> = [];

      for (const f of affectedFeatures) {
        const isCoding = f.type === 'CDS' || f.type === 'gene' || f.type === 'reporter' || f.type === 'resistance marker';
        if (isCoding && cand.originalCodon && cand.originalCodon !== 'N/A') {
          const desc = cand.isSynonymous
            ? `Synonymous codon mutation (${cand.originalCodon} → ${cand.mutatedCodon}, ${cand.aminoAcid}) in ${f.name}`
            : `Missense mutation (${cand.originalCodon} → ${cand.mutatedCodon}, ${cand.aminoAcid}) in ${f.name}`;
          proteinEffects.push({
            featureId: f.id,
            featureName: f.name,
            aminoAcidBefore: cand.aminoAcid,
            aminoAcidAfter: cand.aminoAcid,
            codonBefore: cand.originalCodon,
            codonAfter: cand.mutatedCodon,
            isSynonymous: cand.isSynonymous,
            description: desc
          });
        }
      }

      const summary = totalSitesAfter === 0
        ? `Silent mutation at ${start1} (${beforeSeq}→${afterSeq}) to abolish ${typeIISEnzyme.name} site (0 sites remaining)`
        : `Silent mutation at ${start1} (${beforeSeq}→${afterSeq}) in ${typeIISEnzyme.name} site (${totalSitesBefore}→${totalSitesAfter} sites; ${totalSitesAfter} remaining)`;

      // Save to candidateCache
      candidateCache.set(candidateId, {
        candidateId,
        documentId: doc.id,
        baseRevision: doc.version,
        baseSequenceHash: hash,
        start1,
        end1,
        beforeSequence: beforeSeq,
        afterSequence: afterSeq,
        summary
      });

      return {
        candidateId,
        documentId: doc.id,
        baseRevision: doc.version,
        baseSequenceHash: hash,
        start1,
        end1,
        beforeSequence: beforeSeq,
        afterSequence: afterSeq,
        codonIndex: cand.codonIndex,
        originalCodon: cand.originalCodon,
        mutatedCodon: cand.mutatedCodon,
        aminoAcid: cand.aminoAcid,
        isSynonymous: cand.isSynonymous,
        affectedFeatureIds,
        proteinEffects,
        restrictionEffect: {
          enzyme: typeIISEnzyme.name,
          sitesBefore: totalSitesBefore,
          sitesAfter: totalSitesAfter
        },
        nucleotideChanges: [
          {
            position1: start1,
            before: beforeSeq,
            after: afterSeq
          }
        ]
      };
    });

    return createSuccess({
      documentId: doc.id,
      documentName: doc.name,
      baseRevision: doc.version,
      baseSequenceHash: hash,
      enzyme: typeIISEnzyme.name,
      candidatesCount: formattedCandidates.length,
      candidates: formattedCandidates,
      summary: formattedCandidates.length > 0
        ? `Found ${formattedCandidates.length} domestication candidate(s) for ${typeIISEnzyme.name}.`
        : `No internal ${typeIISEnzyme.name} recognition sites found.`
    });
  }
};

export const seqcraftPlanDomesticationTool: SeqCraftToolDefinition = {
  ...seqcraftDomesticateSequenceTool,
  name: 'seqcraft_plan_domestication',
  title: 'Plan Domestication'
};

export const seqcraftStageDomesticationCandidateTool: SeqCraftToolDefinition = {
  name: 'seqcraft_stage_domestication_candidate',
  title: 'Stage Domestication Candidate',
  description: 'Stage an exact synonymous mutation candidate returned by seqcraft_domesticate_sequence. Checks revision locking to ensure the molecule was not modified since analysis, then creates a revision-locked transaction for human review.',
  effectClass: 'sequence_mutation',
  inputSchema: {
    type: 'object',
    properties: {
      candidateId: {
        type: 'string',
        description: 'The candidateId returned by seqcraft_domesticate_sequence.'
      },
      documentId: {
        type: 'string',
        description: 'Optional target document ID.'
      }
    },
    required: ['candidateId'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (input: { candidateId: string; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const candidate = candidateCache.get(input.candidateId);
    if (!candidate) {
      return createError('CANDIDATE_NOT_FOUND', `Candidate '${input.candidateId}' not found. Please run seqcraft_domesticate_sequence first.`);
    }

    const doc = ctx.workspace.documents.find(d => d.id === candidate.documentId);
    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const rawSeq = doc.sequence ? getMemorySequence(doc).raw : '';
    const currentHash = await computeSequenceSha256(rawSeq);

    // Stale check: revision or hash mismatch
    if (doc.version !== candidate.baseRevision || currentHash !== candidate.baseSequenceHash) {
      return createError(
        'STALE_CANDIDATE',
        `Candidate is stale. Document was modified (v${candidate.baseRevision} -> v${doc.version}).`,
        'Re-run the analysis against the current revision.'
      );
    }

    const domainAction: SequenceEditAction = {
      type: 'replace',
      start0: candidate.start1 - 1,
      end0Exclusive: candidate.end1,
      replacement: candidate.afterSequence
    };

    const invariantReport = evaluateTransactionInvariants(doc, domainAction);
    const txId = `tx_${generateId()}`;

    const tx: SequenceTransaction = {
      id: txId,
      documentId: doc.id,
      baseRevision: doc.version,
      baseSequenceHash: currentHash,
      expectedSequenceHash: '',
      operation: domainAction,
      status: 'pending',
      affectedRange: { start0: candidate.start1 - 1, end0Exclusive: candidate.end1 },
      affectedRange1: { start1: candidate.start1, end1: candidate.end1 },
      beforeFragment: candidate.beforeSequence,
      afterFragment: candidate.afterSequence,
      invariantReport
    };

    ctx.activity.setPendingTransaction(tx);

    return createSuccess({
      status: 'awaiting_approval',
      transactionId: txId,
      documentId: doc.id,
      baseRevision: doc.version,
      baseSequenceHash: currentHash,
      operation: domainAction,
      summary: candidate.summary,
      instruction: 'The candidate has been staged for human review. Call seqcraft_get_transaction_status to confirm when approved.'
    });
  }
};

export const seqcraftStageSequenceTransactionTool: SeqCraftToolDefinition = {
  ...seqcraftStageDomesticationCandidateTool,
  name: 'seqcraft_stage_sequence_transaction',
  title: 'Stage Sequence Transaction'
};

export const seqcraftPrepareRestrictionCloneTool: SeqCraftToolDefinition = {
  name: 'seqcraft_prepare_restriction_clone',
  title: 'Prepare Restriction Clone',
  description: 'Simulate restriction cloning between an insert construct and a destination vector using compatible restriction enzyme sticky ends.',
  effectClass: 'workspace_ephemeral',
  inputSchema: {
    type: 'object',
    properties: {
      insertDocumentId: { type: 'string', description: 'Insert document ID.' },
      insertEnzyme1: { type: 'string', description: '5\' restriction enzyme on insert.' },
      insertEnzyme2: { type: 'string', description: '3\' restriction enzyme on insert.' },
      vectorDocumentId: { type: 'string', description: 'Destination vector document ID.' },
      vectorEnzyme1: { type: 'string', description: '5\' restriction enzyme on vector.' },
      vectorEnzyme2: { type: 'string', description: '3\' restriction enzyme on vector.' }
    },
    required: ['insertDocumentId', 'insertEnzyme1', 'insertEnzyme2', 'vectorDocumentId', 'vectorEnzyme1', 'vectorEnzyme2'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: true },
  execute: (
    input: {
      insertDocumentId: string;
      vectorDocumentId?: string;
      enzymeNames?: string[];
      insertEnzyme1?: string;
      insertEnzyme2?: string;
      vectorEnzyme1?: string;
      vectorEnzyme2?: string;
      vectorFragmentId?: string;
      insertFragmentId?: string;
    },
    rawCtx
  ) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();

    const enzymes = input.enzymeNames && input.enzymeNames.length > 0
      ? input.enzymeNames
      : Array.from(new Set([input.insertEnzyme1, input.insertEnzyme2, input.vectorEnzyme1, input.vectorEnzyme2].filter(Boolean) as string[]));

    if (enzymes.length === 0) {
      return createError('INVALID_INPUT', 'Must provide enzymeNames array or individual enzyme parameters.');
    }

    const res = prepareRestrictionClone({
      vectorDocumentId: input.vectorDocumentId || ctx.workspace.activeDocumentId || undefined,
      insertDocumentId: input.insertDocumentId,
      enzymeNames: enzymes,
      vectorFragmentId: input.vectorFragmentId,
      insertFragmentId: input.insertFragmentId
    });

    if (!res.ok || !res.proposal) {
      return createError((res as any).error || 'CLONE_FAILED', `Failed to prepare restriction clone: ${(res as any).error || 'No compatible recombinant candidates found.'}`);
    }

    const p = res.proposal;
    return createSuccess({
      status: 'awaiting_approval',
      requiresHumanApproval: true,
      proposalId: p.proposalId,
      vectorDocumentName: p.vectorDocumentName,
      insertDocumentName: p.insertDocumentName,
      candidatesCount: p.candidates.length,
      recombinantCandidateLengths: p.candidates.map(c => c.recombinantSequence.length),
      junctionCompatibility: {
        junction1: p.candidates[0]?.junction1?.isCompatible ?? true,
        junction2: p.candidates[0]?.junction2?.isCompatible ?? true
      },
      candidates: p.candidates.map(c => ({
        id: c.id,
        lengthBp: c.recombinantSequence.length,
        orientation: c.orientation,
        junction1: c.junction1,
        junction2: c.junction2
      }))
    });
  }
};

export const cloningTools: SeqCraftToolDefinition[] = [
  seqcraftAnalyzeRestrictionSitesTool,
  seqcraftShowRestrictionSiteTool,
  seqcraftSimulateDigestTool,
  seqcraftSimulateGoldenGateTool,
  seqcraftDomesticateSequenceTool,
  seqcraftPlanDomesticationTool,
  seqcraftStageDomesticationCandidateTool,
  seqcraftStageSequenceTransactionTool,
  seqcraftPrepareRestrictionCloneTool
];
