import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { compareSequenceDocuments } from '../../application/sequence-diff';
import { findORFs } from '../../scientific/orf';
import { findCrisprTargets } from '../../scientific/crispr';
import type { CasNucleaseId } from '../../domain/crispr';
import { screenBiosecurity } from '../../scientific/biosecurity';
import { getMemorySequence } from '../../utils/document-utils';

export const seqcraftCompareDocumentsTool: SeqCraftToolDefinition = {
  name: 'seqcraft_compare_documents',
  title: 'Compare Documents',
  description: 'Perform pairwise biological sequence comparison and alignment between two documents in the workspace. Returns identity percentage, nucleotide differences (substitutions, insertions, deletions), and feature discrepancies.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      sourceDocumentId: {
        type: 'string',
        description: 'First (reference) document ID.'
      },
      targetDocumentId: {
        type: 'string',
        description: 'Second (comparison) document ID.'
      }
    },
    required: ['sourceDocumentId', 'targetDocumentId'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: async (input: { sourceDocumentId: string; targetDocumentId: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    const refId = (input as any).referenceDocumentId || input.sourceDocumentId;
    const qryId = (input as any).queryDocumentId || input.targetDocumentId;

    const docA = ctx.workspace.documents.find(d => d.id === refId);
    const docB = ctx.workspace.documents.find(d => d.id === qryId);

    if (!docA || !docB) {
      return createError('DOCUMENT_NOT_FOUND', 'One or both documents to compare were not found.');
    }

    const diff = await compareSequenceDocuments(docA, docB, { includeUnchangedFeatures: true });
    const res = diff.result;
    const unchangedFeats = (res.featureDifferences || []).filter(f => f.kind === 'unchanged');

    return createSuccess({
      sourceDocument: docA.name,
      targetDocument: docB.name,
      referenceDocument: docA.name,
      queryDocument: docB.name,
      coordinateSystem: res.coordinateSystem,
      identical: res.exact && res.differences.length === 0,
      differenceCount: res.differences.length,
      editDistance: res.differences.length === 0 ? 0 : res.editDistance,
      identityPercentage: res.differences.length === 0 ? 100 : res.identityPercent,
      circularOriginInvariant: res.canonicalization?.circularOriginInvariant ?? false,
      topologyChanged: res.representation?.topologyChanged ?? false,
      representation: res.representation,
      unchangedFeatureCount: unchangedFeats.length,
      featureDifferencesCount: res.featureDifferences.length,
      proteinConsequencesCount: res.proteinConsequences.length,
      diffsCount: res.differences.length,
      diffs: res.differences.slice(0, 50).map(d => ({
        type: d.kind,
        sourcePosition1: d.referenceStart0 + 1,
        targetPosition1: d.queryStart0 + 1,
        referenceBases: d.referenceBases,
        queryBases: d.queryBases
      }))
    });
  }
};

export const seqcraftFindOrfsTool: SeqCraftToolDefinition = {
  name: 'seqcraft_find_orfs',
  title: 'Find ORFs',
  description: 'Search for open reading frames across all six reading frames using NCBI genetic code table 1 and a configurable minimum codon count.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      },
      minCodons: {
        type: 'integer',
        minimum: 10,
        description: 'Minimum ORF length in codons (default: 30 codons = 90 bp).'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { documentId?: string; minCodons?: number }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const raw = doc.sequence ? getMemorySequence(doc).raw : '';
    const orfs = findORFs(raw, doc.topology, input.minCodons || 30);

    const formatted = orfs.map((o, idx) => {
      const seg0 = o.segments[0];
      return {
        id: `orf_${idx + 1}`,
        name: `ORF ${idx + 1} (${o.strand === 1 ? '+' : '-'}${o.frame})`,
        strand: o.strand === 1 ? '+' : '-',
        frame: o.frame,
        start1: seg0 ? seg0.start0 + 1 : 1,
        end1: seg0 ? seg0.end0Exclusive : 1,
        lengthBp: o.lengthBp,
        codonCount: Math.floor(o.lengthBp / 3),
        proteinTranslation: o.protein.slice(0, 40) + (o.protein.length > 40 ? '…' : '')
      };
    });

    return createSuccess({
      documentName: doc.name,
      minCodons: input.minCodons || 30,
      orfCount: formatted.length,
      orfs: formatted
    });
  }
};

export const seqcraftFindCrisprTargetsTool: SeqCraftToolDefinition = {
  name: 'seqcraft_find_crispr_targets',
  title: 'Find CRISPR Targets',
  description: 'Scan sequence for CRISPR-Cas guide RNA target sites and protospacers across multiple Cas effectors (SpCas9, SaCas9, Cas12a/Cpf1, Cas12e/CasX). Computes on-target quality scores, GC balance, Pol III termination penalties, and MMEJ frameshift predictions.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      },
      nuclease: {
        type: 'string',
        enum: ['SpCas9', 'SaCas9', 'Cas12a', 'Cas12e'],
        description: "CRISPR Cas nuclease system (default: SpCas9). SpCas9 (3' NGG), SaCas9 (3' NNGRRT), Cas12a (5' TTTV), Cas12e (5' TTCN)."
      },
      minQualityScore: {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        description: 'Minimum quality score threshold (0-100, default: 0).'
      },
      maxResults: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of target sites returned (default: 20).'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { nuclease?: CasNucleaseId; documentId?: string; minQualityScore?: number; maxResults?: number }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const raw = doc.sequence ? getMemorySequence(doc).raw : '';
    const targets = findCrisprTargets(raw, doc.topology, {
      nuclease: input.nuclease || 'SpCas9',
      minQualityScore: input.minQualityScore,
      maxResults: input.maxResults || 20
    });

    const formatted = targets.map(t => ({
      nuclease: t.nucleaseName,
      spacer: t.spacer,
      pam: t.pam,
      pamOrientation: t.pamOrientation,
      cleavageType: t.cleavageType,
      pamRange: {
        start1: t.pamStart0 + 1,
        end1: t.pamEnd0Exclusive
      },
      cutSite1: t.cutSite0 + 1,
      bottomCutSite1: t.bottomCutSite0 ? t.bottomCutSite0 + 1 : undefined,
      strand: t.strand === -1 ? '-' : '+',
      qualityScore: t.qualityScore,
      gcPercent: t.gcPercent,
      frameshiftProbability: t.frameshiftProbability,
      penalties: t.penalties
    }));

    return createSuccess({
      documentName: doc.name,
      nuclease: input.nuclease || 'SpCas9',
      count: targets.length,
      targetsFound: targets.length,
      targets: formatted
    });
  }
};

export const seqcraftScreenBiosecurityTool: SeqCraftToolDefinition = {
  name: 'seqcraft_screen_biosecurity',
  title: 'Screen Biosecurity',
  description: 'Run automated biosecurity reference pre-screening against diagnostic signature motifs of regulated Select Agents and Controlled Biological Toxins (Filoviruses, Poxviruses, Henipaviruses, Anthrax, Tularemia, Plague, BoNT, Ricin). Informational diagnostic screening only.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const raw = doc.sequence ? getMemorySequence(doc).raw : '';
    const report = screenBiosecurity(raw, doc.topology);
    return createSuccess({
      documentName: doc.name,
      isCompliant: report.isCompliant,
      status: report.status,
      overallTier: report.overallTier,
      matchCount: report.matchCount,
      flaggedHitsCount: report.flaggedHitsCount,
      diagnosticNotice: report.diagnosticNotice,
      recommendation: report.recommendation,
      summary: report.summary,
      matches: report.matches.map(m => ({
        agent: m.agentName,
        category: m.category,
        regulatoryFramework: m.regulatoryFramework,
        start0: m.start0,
        end0Exclusive: m.end0Exclusive,
        start1: m.start1,
        end1: m.end1,
        strand: m.strand === 1 ? '+' : '-',
        severity: m.severity,
        providerAction: m.providerAction
      }))
    });
  }
};

export const analysisTools: SeqCraftToolDefinition[] = [
  seqcraftCompareDocumentsTool,
  seqcraftFindOrfsTool,
  seqcraftFindCrisprTargetsTool,
  seqcraftScreenBiosecurityTool
];
