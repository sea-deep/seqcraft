import { describe, it, expect } from 'vitest';
import { analyzeRestrictionSites, getUniqueCutters, getDoubleCutters, getNonCutters, reverseComplementIupac, getEndType } from '../../src/scientific/restriction-analysis';
import type { RestrictionEnzyme } from '../../src/domain/restriction';

const EcoRI: RestrictionEnzyme = { id: 'ecori', name: 'EcoRI', recognitionSequence: 'GAATTC', forwardCutOffset: 1, reverseCutOffset: 5 };
const SmaI: RestrictionEnzyme = { id: 'smai', name: 'SmaI', recognitionSequence: 'CCCGGG', forwardCutOffset: 3, reverseCutOffset: 3 };
const BsaI: RestrictionEnzyme = { id: 'bsai', name: 'BsaI', recognitionSequence: 'GGTCTC', forwardCutOffset: 7, reverseCutOffset: 11 };

describe('restriction-analysis', () => {
  it('reverse complement IUPAC works', () => {
    expect(reverseComplementIupac('GAATTC')).toBe('GAATTC'); // palindromic
    expect(reverseComplementIupac('GGTCTC')).toBe('GAGACC'); // non-palindromic
    expect(reverseComplementIupac('RYKMSWBDHVN')).toBe('NBDHVWSKMRY');
  });

  describe('EcoRI standard site detection', () => {
    it('detects a single EcoRI site on linear DNA', () => {
      const seq = 'ATGCGAATTCATGC';
      //           0123456789
      // EcoRI starts at 4
      const sites = analyzeRestrictionSites(seq, 'linear', [EcoRI]);
      expect(sites.length).toBe(1);
      expect(sites[0]).toMatchObject({
        enzymeId: 'ecori',
        start0: 4,
        end0Exclusive: 10,
        strand: 1,
        forwardCut0: 5,
        reverseCut0: 9
      });
    });

    it('detects multiple EcoRI sites', () => {
      const seq = 'GAATTC' + 'AAAA' + 'GAATTC';
      const sites = analyzeRestrictionSites(seq, 'linear', [EcoRI]);
      expect(sites.length).toBe(2);
      expect(sites[0].start0).toBe(0);
      expect(sites[1].start0).toBe(10);
    });

    it('detects site at coordinate 0', () => {
      const sites = analyzeRestrictionSites('GAATTCAAAA', 'linear', [EcoRI]);
      expect(sites.length).toBe(1);
      expect(sites[0].start0).toBe(0);
      expect(sites[0].end0Exclusive).toBe(6);
    });

    it('detects site ending exactly at sequenceLength', () => {
      const sites = analyzeRestrictionSites('AAAAGAATTC', 'linear', [EcoRI]);
      expect(sites.length).toBe(1);
      expect(sites[0].start0).toBe(4);
      expect(sites[0].end0Exclusive).toBe(10);
    });
  });

  describe('Circular DNA support', () => {
    it('detects circular EcoRI site crossing coordinate zero', () => {
      // "AATTC" at start, "G" at end
      const seq = 'AATTCAAAA' + 'G'; // GAATTC wrapped around
      // Index of G is 9. It starts at 9.
      const sites = analyzeRestrictionSites(seq, 'circular', [EcoRI]);
      expect(sites.length).toBe(1);
      expect(sites[0].start0).toBe(9);
      expect(sites[0].end0Exclusive).toBe(5); // wraps around
      expect(sites[0].forwardCut0).toBe(0); // 9 + 1 = 10 -> % 10 = 0
      expect(sites[0].reverseCut0).toBe(4); // 9 + 5 = 14 -> % 10 = 4
    });

    it('same origin-spanning pattern on linear DNA produces NO hit', () => {
      const seq = 'AATTCAAAA' + 'G'; 
      const sites = analyzeRestrictionSites(seq, 'linear', [EcoRI]);
      expect(sites.length).toBe(0);
    });
  });

  describe('Palindromic vs non-palindromic handling', () => {
    it('palindromic enzyme produces one physical hit', () => {
      const sites = analyzeRestrictionSites('GAATTC', 'linear', [EcoRI]);
      expect(sites.length).toBe(1); // Not 2!
      expect(sites[0].strand).toBe(1);
    });

    it('non-palindromic recognition works on reverse strand', () => {
      // BsaI is GGTCTC (forward) and GAGACC (reverse)
      const seq = 'AAAAGAGACCAAAA'; 
      // GAGACC starts at 4. Reverse hit!
      const sites = analyzeRestrictionSites(seq, 'linear', [BsaI]);
      expect(sites.length).toBe(1);
      expect(sites[0].strand).toBe(-1);
      expect(sites[0].start0).toBe(4);
      expect(sites[0].end0Exclusive).toBe(10);
      // Let's verify cuts:
      // matchEnd = 10
      // forwardCut0 = 10 - 11 = -1 -> 13
      // reverseCut0 = 10 - 7 = 3
      expect(sites[0].forwardCut0).toBe(13);
      expect(sites[0].reverseCut0).toBe(3);
    });
  });

  describe('Cut coordinates', () => {
    it('correct forward and reverse cleavage for blunt cutter (SmaI)', () => {
      // SmaI is CCCGGG, forwardCut 3, reverseCut 3
      const sites = analyzeRestrictionSites('CCCGGG', 'linear', [SmaI]);
      expect(sites[0].forwardCut0).toBe(3);
      expect(sites[0].reverseCut0).toBe(3);
    });

    it('correct forward and reverse cleavage for sticky-end cutter (EcoRI)', () => {
      const sites = analyzeRestrictionSites('GAATTC', 'linear', [EcoRI]);
      expect(sites[0].forwardCut0).toBe(1);
      expect(sites[0].reverseCut0).toBe(5);
    });
  });

  describe('Deterministic ordering', () => {
    it('sorts by start0 -> enzymeName -> strand', () => {
      const A: RestrictionEnzyme = { id: 'A', name: 'A', recognitionSequence: 'A', forwardCutOffset: 1, reverseCutOffset: 1 };
      const Z: RestrictionEnzyme = { id: 'Z', name: 'Z', recognitionSequence: 'A', forwardCutOffset: 1, reverseCutOffset: 1 };
      const sites = analyzeRestrictionSites('A', 'linear', [Z, A]);
      // They both start at 0, but A comes before Z
      expect(sites[0].enzymeName).toBe('A');
      expect(sites[1].enzymeName).toBe('Z');
    });
  });

  describe('Enzyme filtering helpers', () => {
    it('filters unique, double, and non-cutters', () => {
      const sites = [
        { id: '1', enzymeId: 'ecori', enzymeName: 'EcoRI', start0: 0, end0Exclusive: 6, strand: 1, recognitionSequence: 'GAATTC', forwardCut0: 1, reverseCut0: 5 },
        { id: '2', enzymeId: 'bamhi', enzymeName: 'BamHI', start0: 10, end0Exclusive: 16, strand: 1, recognitionSequence: 'GGATCC', forwardCut0: 1, reverseCut0: 5 },
        { id: '3', enzymeId: 'bamhi', enzymeName: 'BamHI', start0: 20, end0Exclusive: 26, strand: 1, recognitionSequence: 'GGATCC', forwardCut0: 1, reverseCut0: 5 },
      ] as any[];

      const unique = getUniqueCutters(sites);
      expect(unique.length).toBe(1);
      expect(unique[0].enzymeId).toBe('ecori');

      const double = getDoubleCutters(sites);
      expect(double.length).toBe(2);
      expect(double[0].enzymeId).toBe('bamhi');

      const non = getNonCutters([EcoRI, { id: 'bamhi', name: 'BamHI' } as any, SmaI], sites);
      expect(non.length).toBe(1);
      expect(non[0].id).toBe('smai');
    });
  });

  describe('End type classification', () => {
    it('classifies EcoRI as 5\' overhang', () => {
      expect(getEndType(EcoRI)).toBe("5' overhang");
    });
    it('classifies PstI as 3\' overhang', () => {
      const PstI = { id: 'psti', name: 'PstI', recognitionSequence: 'CTGCAG', forwardCutOffset: 5, reverseCutOffset: 1 };
      expect(getEndType(PstI)).toBe("3' overhang");
    });
    it('classifies SmaI as blunt', () => {
      expect(getEndType(SmaI)).toBe("blunt");
    });
  });
});
