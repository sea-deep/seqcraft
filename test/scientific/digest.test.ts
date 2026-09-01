import { describe, it, expect } from 'vitest';
import { 
  simulateRestrictionDigest, 
  getFragmentLengths, 
  getFragmentCount, 
  getCutCount, 
  getCuttingEnzymeIds, 
  getZeroSiteEnzymeIds 
} from '../../src/scientific/digest';
import type { RestrictionSite } from '../../src/scientific/restriction-analysis';
import { analyzeRestrictionSites } from '../../src/scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../src/data/restriction-enzymes';

const makeSite = (enzymeId: string, forwardCut0: number, reverseCut0: number = forwardCut0): RestrictionSite => ({
  id: `${enzymeId}_1`,
  enzymeId,
  enzymeName: enzymeId.toUpperCase(),
  start0: forwardCut0 - 2,
  end0Exclusive: forwardCut0 + 4,
  strand: 1,
  recognitionSequence: 'AAAAAA',
  forwardCut0,
  reverseCut0
});

describe('simulateRestrictionDigest - general', () => {
  it('linear DNA with zero cuts', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGC',
      topology: 'linear',
      restrictionSites: [],
      selectedEnzymeIds: ['ecori']
    });
    expect(getFragmentCount(result)).toBe(1);
    expect(result.fragments[0].lengthBp).toBe(8);
    expect(result.fragments[0].leftEnd.type).toBe('natural');
    expect(result.fragments[0].rightEnd.type).toBe('natural');
    expect(result.fragments[0].isCircular).toBe(false);
  });

  it('linear DNA with one cut', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGC',
      topology: 'linear',
      restrictionSites: [makeSite('ecori', 4)], 
      selectedEnzymeIds: ['ecori']
    });
    expect(getFragmentCount(result)).toBe(2);
    expect(result.fragments[0].lengthBp).toBe(4);
    expect(result.fragments[1].lengthBp).toBe(4);
    expect(result.fragments[0].rightEnd.type).toBe('5\' overhang'); 
    expect(result.fragments[1].leftEnd.type).toBe('5\' overhang');
  });

  it('linear DNA with two cuts', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGCATGC',
      topology: 'linear',
      restrictionSites: [makeSite('ecori', 4), makeSite('bamhi', 8)],
      selectedEnzymeIds: ['ecori', 'bamhi']
    });
    expect(getFragmentCount(result)).toBe(3);
    const lengths = getFragmentLengths(result);
    expect(lengths).toEqual([4, 4, 4]);
  });

  it('circular DNA with zero cuts', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGC',
      topology: 'circular',
      restrictionSites: [],
      selectedEnzymeIds: ['ecori']
    });
    expect(getFragmentCount(result)).toBe(1);
    expect(result.fragments[0].isCircular).toBe(true);
    expect(result.fragments[0].leftEnd.type).toBe('circular');
    expect(result.fragments[0].lengthBp).toBe(8);
  });

  it('circular DNA with one cut', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGC',
      topology: 'circular',
      restrictionSites: [makeSite('ecori', 4)],
      selectedEnzymeIds: ['ecori']
    });
    expect(getFragmentCount(result)).toBe(1);
    expect(result.fragments[0].isCircular).toBe(false);
    expect(result.fragments[0].lengthBp).toBe(8);
    expect(result.fragments[0].segments).toEqual([
      { start0: 4, end0Exclusive: 8 },
      { start0: 0, end0Exclusive: 4 }
    ]);
  });

  it('circular DNA with two cuts', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGCATGC',
      topology: 'circular',
      restrictionSites: [makeSite('ecori', 4), makeSite('bamhi', 8)],
      selectedEnzymeIds: ['ecori', 'bamhi']
    });
    expect(getFragmentCount(result)).toBe(2);
    const lengths = getFragmentLengths(result);
    expect(lengths).toEqual([4, 8]); 
  });

  it('circular DNA with three cuts', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGCATGCATGC', 
      topology: 'circular',
      restrictionSites: [makeSite('ecori', 2), makeSite('bamhi', 6), makeSite('hindiii', 12)],
      selectedEnzymeIds: ['ecori', 'bamhi', 'hindiii']
    });
    expect(getFragmentCount(result)).toBe(3);
    expect(getFragmentLengths(result)).toEqual([4, 6, 6]); 
  });

  it('fragment lengths always sum to original molecule length', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGCATGCATGC', 
      topology: 'circular',
      restrictionSites: [makeSite('ecori', 2), makeSite('bamhi', 6), makeSite('hindiii', 12)],
      selectedEnzymeIds: ['ecori', 'bamhi', 'hindiii']
    });
    const sum = getFragmentLengths(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(16);
  });

  it('duplicate physical cut positions create one break', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGCATGCATGC', 
      topology: 'linear',
      restrictionSites: [makeSite('ecori', 4), makeSite('bamhi', 4)],
      selectedEnzymeIds: ['ecori', 'bamhi']
    });
    expect(getCutCount(result)).toBe(1);
    expect(getFragmentCount(result)).toBe(2);
    expect(getFragmentLengths(result)).toEqual([4, 12]);
  });

  it('selected enzyme that has zero sites', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGCATGCATGC', 
      topology: 'linear',
      restrictionSites: [makeSite('ecori', 4)],
      selectedEnzymeIds: ['ecori', 'bamhi'] 
    });
    expect(getZeroSiteEnzymeIds(result)).toEqual(['bamhi']);
  });
});

describe('simulateRestrictionDigest - overhangs and ends', () => {
  it('EcoRI end type and overhang', () => {
    const result = simulateRestrictionDigest({
      sequence: 'GAATTC',
      topology: 'linear',
      restrictionSites: [makeSite('ecori', 1, 5)], 
      selectedEnzymeIds: ['ecori']
    });
    const cut = result.fragments[0].rightEnd;
    expect(cut.type).toBe('5\' overhang');
    expect(cut.overhangLength).toBe(4);
    expect(cut.sequence).toBe('AATT');
  });

  it('PstI end type and overhang', () => {
    const result = simulateRestrictionDigest({
      sequence: 'CTGCAG',
      topology: 'linear',
      restrictionSites: [makeSite('psti', 5, 1)], 
      selectedEnzymeIds: ['psti']
    });
    const cut = result.fragments[0].rightEnd;
    expect(cut.type).toBe('3\' overhang');
    expect(cut.sequence).toBe('TGCA');
  });

  it('SmaI blunt end', () => {
    const result = simulateRestrictionDigest({
      sequence: 'CCCGGG',
      topology: 'linear',
      restrictionSites: [makeSite('smai', 3, 3)], 
      selectedEnzymeIds: ['smai']
    });
    const cut = result.fragments[0].rightEnd;
    expect(cut.type).toBe('blunt');
    expect(cut.overhangLength).toBe(0);
    expect(cut.sequence).toBe('');
  });
});

import { DEMO_GENBANK } from '../../src/data/demo-workspace';
import { importGenBank } from '../../src/import/genbank';

describe('simulateRestrictionDigest - pUC19 diagnostics', () => {
  const pUC19Doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
  const pUC19Seq = pUC19Doc.sequence.raw;

  it('simulates EcoRI only', () => {
    const sites = analyzeRestrictionSites(pUC19Seq, 'circular', BUILTIN_ENZYMES);
    const result = simulateRestrictionDigest({
      sequence: pUC19Seq,
      topology: 'circular',
      restrictionSites: sites,
      selectedEnzymeIds: ['ecori']
    });
    expect(getCutCount(result)).toBe(1);
    expect(getFragmentCount(result)).toBe(1);
    expect(getFragmentLengths(result)[0]).toBe(2686);
    expect(result.fragments[0].leftEnd.type).toBe('5\' overhang');
  });

  it('simulates EcoRI + HindIII', () => {
    const sites = analyzeRestrictionSites(pUC19Seq, 'circular', BUILTIN_ENZYMES);
    const result = simulateRestrictionDigest({
      sequence: pUC19Seq,
      topology: 'circular',
      restrictionSites: sites,
      selectedEnzymeIds: ['ecori', 'hindiii']
    });
    expect(getCutCount(result)).toBe(2);
    expect(getFragmentCount(result)).toBe(2);
    const lengths = getFragmentLengths(result);
    expect(lengths.sort((a,b) => a-b)).toEqual([51, 2635]);
    expect(lengths.reduce((a,b) => a+b)).toBe(2686);
  });

  it('simulates BamHI + HindIII', () => {
    const sites = analyzeRestrictionSites(pUC19Seq, 'circular', BUILTIN_ENZYMES);
    const result = simulateRestrictionDigest({
      sequence: pUC19Seq,
      topology: 'circular',
      restrictionSites: sites,
      selectedEnzymeIds: ['bamhi', 'hindiii']
    });
    expect(getCutCount(result)).toBe(2);
    expect(getFragmentCount(result)).toBe(2);
    const lengths = getFragmentLengths(result);
    expect(lengths.sort((a,b) => a-b)).toEqual([30, 2656]);
    expect(lengths.reduce((a,b) => a+b)).toBe(2686);
  });
});

describe('simulateRestrictionDigest - End semantics tests', () => {
  it('EcoRI left/right end orientation', () => {
    // EcoRI cuts G^AATTC at 1/5
    const result = simulateRestrictionDigest({
      sequence: 'GAATTC',
      topology: 'linear',
      restrictionSites: [makeSite('ecori', 1, 5)], 
      selectedEnzymeIds: ['ecori']
    });
    
    // First fragment (left) right end
    const end1 = result.fragments[0].rightEnd;
    expect(end1.type).toBe('5\' overhang');
    expect(end1.fragmentSide).toBe('right');
    expect(end1.protrudingStrand).toBe('reverse');
    expect(end1.sequence).toBe('AATT'); // 5'->3' sequence of the reverse strand overhang

    // Second fragment (right) left end
    const end2 = result.fragments[1].leftEnd;
    expect(end2.type).toBe('5\' overhang');
    expect(end2.fragmentSide).toBe('left');
    expect(end2.protrudingStrand).toBe('forward');
    expect(end2.sequence).toBe('AATT');
  });

  it('PstI left/right end orientation', () => {
    // PstI cuts CTGCA^G at 5/1
    const result = simulateRestrictionDigest({
      sequence: 'CTGCAG',
      topology: 'linear',
      restrictionSites: [makeSite('psti', 5, 1)], 
      selectedEnzymeIds: ['psti']
    });
    
    const end1 = result.fragments[0].rightEnd;
    expect(end1.type).toBe('3\' overhang');
    expect(end1.fragmentSide).toBe('right');
    expect(end1.protrudingStrand).toBe('forward');
    expect(end1.sequence).toBe('TGCA');

    const end2 = result.fragments[1].leftEnd;
    expect(end2.type).toBe('3\' overhang');
    expect(end2.fragmentSide).toBe('left');
    expect(end2.protrudingStrand).toBe('reverse');
    expect(end2.sequence).toBe('TGCA');
  });

  it('SmaI blunt ends', () => {
    const result = simulateRestrictionDigest({
      sequence: 'CCCGGG',
      topology: 'linear',
      restrictionSites: [makeSite('smai', 3, 3)], 
      selectedEnzymeIds: ['smai']
    });
    
    const end1 = result.fragments[0].rightEnd;
    expect(end1.type).toBe('blunt');
    expect(end1.fragmentSide).toBe('right');
    expect(end1.protrudingStrand).toBe('none');
    expect(end1.sequence).toBe('');

    const end2 = result.fragments[1].leftEnd;
    expect(end2.type).toBe('blunt');
    expect(end2.fragmentSide).toBe('left');
    expect(end2.protrudingStrand).toBe('none');
    expect(end2.sequence).toBe('');
  });

  it('single-cut circular fragment receives opposite sides of the same cut', () => {
    const result = simulateRestrictionDigest({
      sequence: 'ATGCGAATTCATGC',
      topology: 'circular',
      restrictionSites: [makeSite('ecori', 5, 9)], // G=4, forward cut = 5, rev cut = 9
      selectedEnzymeIds: ['ecori']
    });
    
    expect(getFragmentCount(result)).toBe(1);
    const frag = result.fragments[0];
    
    expect(frag.leftEnd.sites[0]?.id).toBe('ecori_1');
    expect(frag.leftEnd.fragmentSide).toBe('left');
    
    expect(frag.rightEnd.sites[0]?.id).toBe('ecori_1');
    expect(frag.rightEnd.fragmentSide).toBe('right');
    
    expect(frag.leftEnd.protrudingStrand).toBe('forward');
    expect(frag.rightEnd.protrudingStrand).toBe('reverse');
  });

  it('two-cut fragment receives ends from different cuts correctly', () => {
    const result = simulateRestrictionDigest({
      sequence: 'GAATTCCTGCAG', // length 12
      topology: 'linear',
      // ecori cuts at 1 (forward), 5 (reverse). psti cuts at 11 (forward), 7 (reverse)
      restrictionSites: [makeSite('ecori', 1, 5), makeSite('psti', 11, 7)],
      selectedEnzymeIds: ['ecori', 'psti']
    });
    
    expect(getFragmentCount(result)).toBe(3);
    const middleFrag = result.fragments[1]; // from EcoRI cut to PstI cut
    
    // leftEnd of middle fragment is the right side of the EcoRI cut
    expect(middleFrag.leftEnd.sites[0]?.enzymeId).toBe('ecori');
    expect(middleFrag.leftEnd.fragmentSide).toBe('left');
    
    // rightEnd of middle fragment is the left side of the PstI cut
    expect(middleFrag.rightEnd.sites[0]?.enzymeId).toBe('psti');
    expect(middleFrag.rightEnd.fragmentSide).toBe('right');
  });

  it('duplicate physical cut retains all contributing enzymes', () => {
    const site1 = makeSite('ecori', 4, 8);
    const site2 = makeSite('bamhi', 4, 8);
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGCATGCATGC', 
      topology: 'linear',
      restrictionSites: [site1, site2],
      selectedEnzymeIds: ['ecori', 'bamhi']
    });
    
    const cutRight = result.fragments[0].rightEnd;
    expect(cutRight.sites.length).toBe(2);
    expect(cutRight.sites.map(s => s.enzymeId)).toContain('ecori');
    expect(cutRight.sites.map(s => s.enzymeId)).toContain('bamhi');
    expect(cutRight.isAmbiguousChemistry).toBe(false);
  });
  
  it('ambiguous chemistry marked explicitly', () => {
    const site1 = makeSite('ecori', 4, 8);
    const site2 = makeSite('smai', 4, 4); // Blunt cut at same forward coordinate
    const result = simulateRestrictionDigest({
      sequence: 'ATGCATGCATGCATGC', 
      topology: 'linear',
      restrictionSites: [site1, site2],
      selectedEnzymeIds: ['ecori', 'smai']
    });
    
    const cutRight = result.fragments[0].rightEnd;
    expect(cutRight.isAmbiguousChemistry).toBe(true);
    // In ambiguous chemistry, sequence is empty and protruding is none to avoid false cloning matches
    expect(cutRight.protrudingStrand).toBe('none');
    expect(cutRight.sequence).toBe('');
  });
});
