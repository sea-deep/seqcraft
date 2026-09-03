import { describe, it, expect } from 'vitest';
import { planRestrictionClone, extractFragmentSequence, extractReverseInsertSequence, invertDigestEnd } from '../../src/scientific/restriction-cloning';
import { simulateRestrictionDigest } from '../../src/scientific/digest';
import { analyzeRestrictionSites } from '../../src/scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../src/data/restriction-enzymes';
import { ScientificSequence } from '../../src/scientific/nucleotide';
import type { SequenceDocument } from '../../src/domain/document';
import { simulatePCR } from '../../src/scientific/pcr';
import { assembleGoldenGate, TYPE_IIS_ENZYMES } from '../../src/scientific/golden-gate';
import { screenBiosecurity, REGULATED_AGENTS } from '../../src/scientific/biosecurity';
import { serializeToGenBank } from '../../src/export/genbank-export';
import { computeSequenceSha256 } from '../../src/utils/sequence-hash';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import crypto from 'crypto';

function makeDoc(name: string, raw: string, topology: 'circular' | 'linear' = 'circular'): SequenceDocument {
  return {
    id: `doc_${name}`,
    name,
    topology,
    length: raw.length,
    storageMode: 'memory',
    sequence: new ScientificSequence(raw, 'DNA'),
    alphabet: 'DNA',
    features: [],
    primers: [],
    source: 'raw',
    version: 1,
  };
}

describe('Deep Remediation & Biological Logic Validation', () => {
  const ecoRI = BUILTIN_ENZYMES.find(e => e.name === 'EcoRI')!;

  describe('1. Restriction Cloning Reverse-Orientation Duplex Math', () => {
    it('regenerates EcoRI recognition sites with 100% fidelity upon insert duplex inversion', () => {
      // Vector with 2 EcoRI sites at 200 and 606
      const prefix = 'A'.repeat(200);
      const insertCore = 'C'.repeat(394); // EcoRI (6) + core (394) = 400
      const suffix = 'T'.repeat(400);
      const plasmid = prefix + 'GAATTC' + insertCore + 'GAATTC' + suffix;

      const vectorDoc = makeDoc('Vector', plasmid, 'circular');
      const insertDoc = makeDoc('Insert', plasmid, 'circular');

      const vSites = analyzeRestrictionSites(plasmid, 'circular', [ecoRI]);
      const vDigest = simulateRestrictionDigest({
        sequence: plasmid,
        topology: 'circular',
        restrictionSites: vSites,
        selectedEnzymeIds: [ecoRI.id],
      });

      // Backbone is the 606 bp fragment, insert is the 400 bp fragment
      const backboneFrag = vDigest.fragments.find(f => f.lengthBp > 500)!;
      const insertFrag = vDigest.fragments.find(f => f.lengthBp <= 500)!;

      const plan = planRestrictionClone({
        vectorDocument: vectorDoc,
        insertDocument: insertDoc,
        enzymes: [ecoRI],
        vectorFragmentId: backboneFrag.id,
        insertFragmentId: insertFrag.id,
      });

      expect(plan.proposal).not.toBeNull();
      const revCandidate = plan.proposal!.candidates.find(c => c.orientation === 'reverse');
      expect(revCandidate).toBeDefined();
      expect(revCandidate!.isValid).toBe(true);

      // Analyze EcoRI sites in the recombinant plasmid
      const recombSites = analyzeRestrictionSites(revCandidate!.recombinantSequence, 'circular', [ecoRI]);
      expect(recombSites.length).toBe(2);
      expect(revCandidate!.recombinantSequence.length).toBe(plasmid.length);
    });

    it('inverts DigestEnd properties correctly', () => {
      const end: import('../../src/domain/digest').DigestEnd = {
        type: "5' overhang",
        fragmentSide: 'left',
        protrudingStrand: 'forward',
        sequence: 'AATT',
        sites: [],
        isAmbiguousChemistry: false,
      };

      const inverted = invertDigestEnd(end);
      expect(inverted.fragmentSide).toBe('right');
      expect(inverted.protrudingStrand).toBe('reverse');
      expect(inverted.sequence).toBe('AATT'); // revcomp of AATT is AATT
    });
  });

  describe('2. PCR Directionality and Overlap Extension', () => {
    it('amplifies linear templates with overlapping 3 primer ends (overlap-extension PCR)', () => {
      // Template: 100 bp
      const templateSeq = 'A'.repeat(30) + 'CGATCGATCG' + 'T'.repeat(30) + 'GCATGCATGC' + 'A'.repeat(20);
      const forwardPrimer = {
        id: 'fwd',
        name: 'Fwd_Primer',
        sequence: 'CGATCGATCGTTT', // binds at 30, 3' at 42
      };
      const reversePrimer = {
        id: 'rev',
        name: 'Rev_Primer',
        sequence: 'GCATGCATGCAAA', // binds reverse strand
      };

      const result = simulatePCR({
        sequence: templateSeq,
        topology: 'linear',
        forwardPrimer,
        reversePrimer,
      });

      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products[0].lengthBp).toBeGreaterThan(15);
    });
  });

  describe('3. Circular Golden Gate Assembly Segment Normalization', () => {
    it('normalizes feature coordinates so no segment exceeds plasmid length after circular trimming', () => {
      // BsaI: GGTCTC(1/5)
      const bsaI = TYPE_IIS_ENZYMES.find(e => e.name === 'BsaI')!;
      const part1Seq = 'GGTCTCA' + 'ATCG' + 'C'.repeat(100) + 'TGCA' + 'AGAGACC';
      const part2Seq = 'GGTCTCA' + 'TGCA' + 'G'.repeat(100) + 'ATCG' + 'AGAGACC';

      const res = assembleGoldenGate(
        [
          {
            id: 'p1',
            name: 'Part1',
            sequence: part1Seq,
            features: [
              {
                id: 'f1',
                name: 'EndFeature',
                type: 'CDS',
                strand: 1,
                segments: [{ start0: 80, end0Exclusive: 110 }],
                source: 'user',
              },
            ],
          },
          {
            id: 'p2',
            name: 'Part2',
            sequence: part2Seq,
            features: [],
          },
        ],
        bsaI,
        'circular'
      );

      expect(res.success).toBe(true);
      const totalLen = res.recombinantSequence.length;
      for (const feat of res.assembledFeatures) {
        for (const seg of feat.segments) {
          expect(seg.end0Exclusive).toBeLessThanOrEqual(totalLen);
          expect(seg.start0).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('4. Biosecurity Circular Screening', () => {
    it('detects regulated signature sequences that cross the origin of a circular sequence', () => {
      // Real Variola major signature from REGULATED_AGENTS
      const sig = 'ACCTAATTATACAGCGGACAT';
      const half1 = sig.slice(10);
      const half2 = sig.slice(0, 10);
      // Origin wrap: half2 is at the very end of plasmid, half1 is at the very start of plasmid
      // When wrapping circularly, plasmid[end] + plasmid[start] forms half2 + half1 = sig!
      const plasmid = half1 + 'A'.repeat(100) + half2;

      const report = screenBiosecurity(plasmid, 'circular');
      expect(report.isCompliant).toBe(false);
      expect(report.matchCount).toBeGreaterThan(0);
      expect(report.matches.some(m => m.matchedSignature === sig)).toBe(true);
    });
  });

  describe('5. GenBank Export Serializer', () => {
    it('serializes sequence, locus header, complement/join features, and formatted origin', () => {
      const seq = 'atgc'.repeat(25); // 100 bp
      const doc = makeDoc('TestPlasmid', seq, 'circular');
      doc.features = [
        {
          id: 'feat1',
          name: 'AmpR',
          type: 'CDS',
          strand: -1,
          segments: [{ start0: 10, end0Exclusive: 40 }],
          source: 'user',
          qualifiers: { gene: 'bla' },
        },
        {
          id: 'feat2',
          name: 'SplitFeature',
          type: 'misc_feature',
          strand: 1,
          segments: [
            { start0: 0, end0Exclusive: 10 },
            { start0: 50, end0Exclusive: 70 },
          ],
          source: 'user',
        },
      ];

      const gbk = serializeToGenBank(doc);
      expect(gbk).toContain('LOCUS       TestPlasmid');
      expect(gbk).toContain('100 bp    DNA     circular SYN');
      expect(gbk).toContain('FEATURES             Location/Qualifiers');
      expect(gbk).toContain('complement(11..40)');
      expect(gbk).toContain('/gene="bla"');
      expect(gbk).toContain('join(1..10,51..70)');
      expect(gbk).toContain('ORIGIN');
      expect(gbk).toContain('//');
    });
  });

  describe('6. Cryptographic Pure TypeScript SHA-256 Fallback', () => {
    it('computes exact SHA-256 hashes matching node:crypto for arbitrary strings', async () => {
      const testCases = [
        'ATGC',
        'ATGCATGCATGCATGCATGCATGCATGCATGC',
        'A'.repeat(500),
        'GATTACA'.repeat(50),
      ];

      for (const seq of testCases) {
        const expected = crypto.createHash('sha256').update(seq.toUpperCase()).digest('hex');
        const computed = await computeSequenceSha256(seq);
        expect(computed).toBe(expected);
      }
    });
  });

  describe('7. Workspace In-Memory Undo / Redo', () => {
    it('tracks sequence mutations and allows clean undo and redo', () => {
      const doc = makeDoc('UndoTestDoc', 'AAAAACCCCCGGGGGTTTTT', 'linear');
      const store = useWorkspaceStore.getState();
      store.addDocument(doc);
      store.setActiveDocument(doc.id);

      // Edit: Replace CCCCC (pos 5..10) with TTTTT
      const editResult = store.mutateDocumentSequence(doc.id, {
        type: 'replace',
        start0: 5,
        end0Exclusive: 10,
        replacement: 'TTTTT',
      });

      expect(editResult.newSequence).toBe('AAAAATTTTTGGGGGTTTTT');
      expect(store.canUndo(doc.id)).toBe(true);

      // Undo
      const undoSuccess = store.undo(doc.id);
      expect(undoSuccess).toBe(true);
      const afterUndoDoc = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
      expect(afterUndoDoc.sequence!.raw).toBe('AAAAACCCCCGGGGGTTTTT');
      expect(store.canRedo(doc.id)).toBe(true);

      // Redo
      const redoSuccess = store.redo(doc.id);
      expect(redoSuccess).toBe(true);
      const afterRedoDoc = useWorkspaceStore.getState().documents.find(d => d.id === doc.id)!;
      expect(afterRedoDoc.sequence!.raw).toBe('AAAAATTTTTGGGGGTTTTT');
    });
  });
});
