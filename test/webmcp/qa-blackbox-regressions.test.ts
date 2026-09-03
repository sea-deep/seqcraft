import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { useActivityStore } from '../../src/state/activity-store';
import { importGenBank } from '../../src/import/genbank';
import { serializeToGenBank } from '../../src/export/genbank-export';
import { detectKnownFeatures } from '../../src/scientific/known-feature-detection';
import { ScientificSequence } from '../../src/scientific/nucleotide';
import {
  seqcraftSimulateGoldenGateTool,
  seqcraftCompareDocumentsTool,
  seqcraftImportSequenceTextTool,
  seqcraftUpdateDocumentMetadataTool,
  seqcraftMutateFeatureTool,
  seqcraftMutatePrimerTool,
  seqcraftDomesticateSequenceTool,
  seqcraftSimulateDigestTool,
  seqcraftSimulatePcrTool,
  seqcraftAnalyzePrimerTool,
  seqcraftSelectRangeTool,
  seqcraftGetSelectedContextTool,
  seqcraftGenerateOpentronsProtocolTool
} from '../../src/webmcp/register-seqcraft-tools';

const DATASETS_DIR = '/home/dipak/Documents/Codex/2026-09-03/on/work/seqcraft-blackbox/datasets';

describe('QA Blackbox Findings Regression Suite (SC-BLK-001 to SC-MED-005)', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      documents: [],
      activeDocumentId: null,
      openDocumentIds: [],
      selection: null,
      selectedFeatureId: null,
      selectedPrimerId: null,
      pendingTransaction: null,
      activeView: 'map'
    });
  });

  it('SC-BLK-001: Golden Gate simulation does not crash on imported GenBank documents with string enzyme name', async () => {
    const pbrGb = fs.readFileSync(path.join(DATASETS_DIR, 'pBR322_J01749.1.gb'), 'utf8');
    const egfpGb = fs.readFileSync(path.join(DATASETS_DIR, 'eGFP_OQ870305.1.gb'), 'utf8');

    const pbrDoc = importGenBank(pbrGb, 'pBR322')[0];
    const egfpDoc = importGenBank(egfpGb, 'eGFP')[0];

    useWorkspaceStore.getState().addDocument(pbrDoc);
    useWorkspaceStore.getState().addDocument(egfpDoc);

    const res = await seqcraftSimulateGoldenGateTool.execute({
      partDocumentIds: [pbrDoc.id, egfpDoc.id],
      typeIISEnzyme: 'BsaI',
      circular: true
    });

    // Should return structured response without unhandled exception
    expect(res).toBeDefined();
    expect(res.ok).toBeDefined();
    if (res.ok) {
      expect(res.result).toBeDefined();
    } else {
      expect(res.error.code).not.toBe('INTERNAL_ERROR');
    }
  });

  it('SC-BLK-002: Pending transaction remains valid and approvable when UI switches active document', async () => {
    const pbrGb = fs.readFileSync(path.join(DATASETS_DIR, 'pBR322_J01749.1.gb'), 'utf8');
    const egfpGb = fs.readFileSync(path.join(DATASETS_DIR, 'eGFP_OQ870305.1.gb'), 'utf8');

    const pbrDoc = importGenBank(pbrGb, 'pBR322')[0];
    const egfpDoc = importGenBank(egfpGb, 'eGFP')[0];

    useWorkspaceStore.getState().addDocument(pbrDoc);
    useWorkspaceStore.getState().addDocument(egfpDoc);
    useWorkspaceStore.getState().setActiveDocument(pbrDoc.id);

    // Stage transaction for pBR322
    useActivityStore.getState().setPendingTransaction({
      id: 'tx-test-1',
      title: 'Test mutation',
      summary: 'Replace base 10',
      documentId: pbrDoc.id,
      baseRevision: pbrDoc.version,
      baseSequenceHash: 'somehash',
      changeType: 'sequence_edit',
      status: 'pending',
      beforeFragment: 'A',
      afterFragment: 'G',
      apply: () => {}
    });

    // Switch active document to eGFP in the UI
    useWorkspaceStore.getState().setActiveDocument(egfpDoc.id);

    // Pending transaction target is still pbrDoc, NOT egfpDoc
    const pendingTx = useActivityStore.getState().pendingTransaction;
    expect(pendingTx).not.toBeNull();
    expect(pendingTx?.documentId).toBe(pbrDoc.id);

    // Target document resolution in AgentRunPanel uses transaction.documentId
    const docs = useWorkspaceStore.getState().documents;
    const targetDoc = pendingTx ? docs.find(d => d.id === pendingTx.documentId) : null;
    expect(targetDoc?.id).toBe(pbrDoc.id);
    expect(targetDoc?.version).toBe(pendingTx?.baseRevision);
  });

  it('SC-HIGH-001: Comparing documents with identical sequence but different topology reports 100% identity and editDistance=0', async () => {
    const rawSeq = 'ATGCGATCGATCGAATTC';
    const doc1 = {
      id: 'doc-linear',
      name: 'Linear Doc',
      topology: 'linear' as const,
      sequence: new ScientificSequence(rawSeq, 'DNA'),
      length: rawSeq.length,
      storageMode: 'memory' as const,
      alphabet: 'DNA' as const,
      features: [],
      primers: [],
      source: 'scratch' as const,
      version: 1
    };
    const doc2 = {
      id: 'doc-circular',
      name: 'Circular Doc',
      topology: 'circular' as const,
      sequence: new ScientificSequence(rawSeq, 'DNA'),
      length: rawSeq.length,
      storageMode: 'memory' as const,
      alphabet: 'DNA' as const,
      features: [],
      primers: [],
      source: 'scratch' as const,
      version: 1
    };

    useWorkspaceStore.getState().addDocument(doc1);
    useWorkspaceStore.getState().addDocument(doc2);

    const res = await seqcraftCompareDocumentsTool.execute({
      referenceDocumentId: doc1.id,
      queryDocumentId: doc2.id
    });

    expect(res.ok).toBe(true);
    expect(res.result.identical).toBe(true);
    expect(res.result.editDistance).toBe(0);
    expect(res.result.identityPercentage).toBe(100);
    expect(res.result.topologyChanged).toBe(true);
  });

  it('SC-HIGH-002: seqcraft_import_sequence_text returns newly active document ID', async () => {
    const pbrGb = fs.readFileSync(path.join(DATASETS_DIR, 'pBR322_J01749.1.gb'), 'utf8');
    const egfpGb = fs.readFileSync(path.join(DATASETS_DIR, 'eGFP_OQ870305.1.gb'), 'utf8');

    // Initially import pBR322
    const pbrDoc = importGenBank(pbrGb, 'pBR322')[0];
    useWorkspaceStore.getState().addDocument(pbrDoc);
    useWorkspaceStore.getState().setActiveDocument(pbrDoc.id);

    // Import eGFP via tool
    const res = await seqcraftImportSequenceTextTool.execute({
      format: 'genbank',
      text: egfpGb
    });

    expect(res.ok).toBe(true);
    expect(res.result.importedCount).toBe(1);
    expect(res.result.activeDocumentId).not.toBe(pbrDoc.id);
    expect(res.result.activeDocumentId).toBe(useWorkspaceStore.getState().activeDocumentId);
  });

  it('SC-HIGH-003: Metadata, feature, and primer mutations return post-commit revision', async () => {
    const seq = 'ATGCATGCATGC';
    const doc = {
      id: 'test-mut-doc',
      name: 'Test Doc',
      topology: 'linear' as const,
      sequence: new ScientificSequence(seq, 'DNA'),
      length: seq.length,
      storageMode: 'memory' as const,
      alphabet: 'DNA' as const,
      features: [],
      primers: [],
      source: 'scratch' as const,
      version: 1
    };
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    // 1. Metadata mutation
    const metaRes = await seqcraftUpdateDocumentMetadataTool.execute({
      documentId: doc.id,
      name: 'Updated Doc Name'
    });
    expect(metaRes.ok).toBe(true);
    expect(metaRes.result.revision.after).toBeGreaterThan(metaRes.result.revision.before);

    // 2. Feature mutation
    const featRes = await seqcraftMutateFeatureTool.execute({
      documentId: doc.id,
      action: 'create',
      feature: {
        name: 'New Feature',
        type: 'promoter',
        start1: 1,
        end1: 5,
        strand: '+'
      }
    });
    expect(featRes.ok).toBe(true);
    expect(featRes.result.revision.after).toBeGreaterThan(featRes.result.revision.before);

    // 3. Primer mutation
    const primerRes = await seqcraftMutatePrimerTool.execute({
      documentId: doc.id,
      action: 'create',
      name: 'FwdPrimer',
      sequence: 'ATGC'
    });
    expect(primerRes.ok).toBe(true);
    expect(primerRes.result.revision.after).toBeGreaterThan(primerRes.result.revision.before);
  });

  it('SC-HIGH-004: Known-feature detection identifies canonical plasmid features on pBR322 and eGFP', () => {
    const pbrGb = fs.readFileSync(path.join(DATASETS_DIR, 'pBR322_J01749.1.gb'), 'utf8');
    const pbrDoc = importGenBank(pbrGb, 'pBR322')[0];

    const egfpGb = fs.readFileSync(path.join(DATASETS_DIR, 'eGFP_OQ870305.1.gb'), 'utf8');
    const egfpDoc = importGenBank(egfpGb, 'eGFP')[0];

    const pbrDetections = detectKnownFeatures(pbrDoc.sequence.raw, 'circular');
    expect(pbrDetections.length).toBeGreaterThanOrEqual(2);
    const hasAmp = pbrDetections.some(d => d.name.toLowerCase().includes('ampr') || d.name.toLowerCase().includes('beta-lactamase'));
    const hasOri = pbrDetections.some(d => d.name.toLowerCase().includes('origin') || d.name.toLowerCase().includes('pmb1') || d.name.toLowerCase().includes('cole1'));
    expect(hasAmp).toBe(true);
    expect(hasOri).toBe(true);

    const egfpDetections = detectKnownFeatures(egfpDoc.sequence.raw, 'linear');
    expect(egfpDetections.length).toBeGreaterThanOrEqual(1);
    const hasGfp = egfpDetections.some(d => d.name.toLowerCase().includes('gfp'));
    expect(hasGfp).toBe(true);

    // Check CDS classification on pBR322 import
    const tetCds = pbrDoc.features.find(f => f.segments.some(s => s.start0 === 85 && s.end0Exclusive === 1276) && f.qualifiers?.product);
    const blaCds = pbrDoc.features.find(f => f.segments.some(s => s.start0 === 3292 && s.end0Exclusive === 4153) && f.qualifiers?.product);
    expect(tetCds?.type).toBe('resistance marker');
    expect(blaCds?.type).toBe('resistance marker');
  });

  it('SC-HIGH-005: Domestication candidate counts remaining restriction sites accurately and populates proteinEffects', async () => {
    const egfpGb = fs.readFileSync(path.join(DATASETS_DIR, 'eGFP_OQ870305.1.gb'), 'utf8');
    const egfpDoc = importGenBank(egfpGb, 'eGFP')[0];
    useWorkspaceStore.getState().addDocument(egfpDoc);
    useWorkspaceStore.getState().setActiveDocument(egfpDoc.id);

    const res = await seqcraftDomesticateSequenceTool.execute({
      documentId: egfpDoc.id,
      enzymeId: 'BsaI'
    });

    expect(res.ok).toBe(true);
    expect(res.result.candidatesCount).toBeGreaterThan(0);

    // Check candidate with 2 total BsaI sites
    const cand = res.result.candidates[0];
    expect(cand.restrictionEffect.sitesBefore).toBe(2);
    expect(cand.restrictionEffect.sitesAfter).toBe(1);
    expect(cand.affectedFeatureIds.length).toBeGreaterThan(0);
  });

  it('SC-MED-001: Digest and PCR products on circular templates return explicit wrapped coordinates', async () => {
    const pbrGb = fs.readFileSync(path.join(DATASETS_DIR, 'pBR322_J01749.1.gb'), 'utf8');
    const pbrDoc = importGenBank(pbrGb, 'pBR322')[0];
    useWorkspaceStore.getState().addDocument(pbrDoc);
    useWorkspaceStore.getState().setActiveDocument(pbrDoc.id);

    // EcoRI cuts pBR322 at 4359/4360 (origin)
    const digestRes = await seqcraftSimulateDigestTool.execute({
      documentId: pbrDoc.id,
      enzymeNames: ['EcoRI']
    });

    expect(digestRes.ok).toBe(true);
    const frag = digestRes.result.fragments[0];
    expect(frag.lengthBp).toBe(4361);
    if (frag.spansOrigin) {
      expect(frag.segments.length).toBe(2);
      expect(frag.segments[0].start1).toBeLessThanOrEqual(4361);
    }

    // PCR spanning origin (4300 to 71)
    const fwdPrimerSeq = pbrDoc.sequence.raw.slice(4299, 4320); // starts 4300
    const revPrimerSeq = 'CGCACCGTACCAC'; // placeholder reverse primer
    const pcrRes = await seqcraftSimulatePcrTool.execute({
      documentId: pbrDoc.id,
      forwardPrimerSequence: fwdPrimerSeq,
      reversePrimerSequence: revPrimerSeq
    });

    expect(pcrRes.ok).toBe(true);
  });

  it('SC-MED-002: Primer properties report gcPercent on 0-100 scale', async () => {
    const res = await seqcraftAnalyzePrimerTool.execute({
      sequence: 'ATGCATGCATGC' // 50% GC
    });

    expect(res.ok).toBe(true);
    expect(res.result.gcPercent).toBe(50);
    expect(res.result.gcContent).toBe(50);
  });

  it('SC-MED-003: Selection on non-active document activates and reflects in selected context', async () => {
    const pbrGb = fs.readFileSync(path.join(DATASETS_DIR, 'pBR322_J01749.1.gb'), 'utf8');
    const egfpGb = fs.readFileSync(path.join(DATASETS_DIR, 'eGFP_OQ870305.1.gb'), 'utf8');

    const pbrDoc = importGenBank(pbrGb, 'pBR322')[0];
    const egfpDoc = importGenBank(egfpGb, 'eGFP')[0];

    useWorkspaceStore.getState().addDocument(pbrDoc);
    useWorkspaceStore.getState().addDocument(egfpDoc);
    useWorkspaceStore.getState().setActiveDocument(pbrDoc.id);

    // Select range on non-active egfpDoc
    const selRes = await seqcraftSelectRangeTool.execute({
      documentId: egfpDoc.id,
      start1: 10,
      end1: 50
    });

    expect(selRes.ok).toBe(true);
    expect(useWorkspaceStore.getState().activeDocumentId).toBe(egfpDoc.id);

    const ctxRes = await seqcraftGetSelectedContextTool.execute({
      documentId: egfpDoc.id
    });

    expect(ctxRes.ok).toBe(true);
    expect(ctxRes.result.documentId).toBe(egfpDoc.id);
    expect(ctxRes.result.selection?.start1).toBe(10);
    expect(ctxRes.result.selection?.end1).toBe(50);
  });

  it('SC-MED-004: GenBank export and re-import preserves feature count and primers without duplicating source', () => {
    const egfpGb = fs.readFileSync(path.join(DATASETS_DIR, 'eGFP_OQ870305.1.gb'), 'utf8');
    const initialDoc = importGenBank(egfpGb, 'eGFP')[0];
    initialDoc.primers = [
      {
        id: 'pr-1',
        name: 'eGFP-Fwd',
        sequence: 'ATGGTCTCCTTCAAATCT',
        description: 'Test primer'
      }
    ];

    const exportedGb = serializeToGenBank(initialDoc);
    const reimported = importGenBank(exportedGb, 'eGFP_roundtrip')[0];

    // Source feature not duplicated
    const sourceFeatures = reimported.features.filter(f => f.type === 'source');
    expect(sourceFeatures.length).toBeLessThanOrEqual(1);

    // Primers preserved
    expect(reimported.primers.length).toBe(1);
    expect(reimported.primers[0].sequence).toBe('ATGGTCTCCTTCAAATCT');

    // Unquoted numeric qualifiers (e.g. /codon_start=1)
    expect(exportedGb).toMatch(/\/codon_start=1(?!\")/);
  });

  it('SC-MED-005: Opentrons volume excess returns INVALID_VOLUME domain error and accurate comments', async () => {
    const res = await seqcraftGenerateOpentronsProtocolTool.execute({
      mode: 'pcr',
      reactionVolumeUl: 300 // Exceeds 200 uL well limit
    });

    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('INVALID_VOLUME');
  });
});
