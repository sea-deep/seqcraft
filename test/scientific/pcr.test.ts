import { describe, it, expect } from 'vitest';
import { simulatePCR, getPCRProductCount, isUniquePCRProduct, hasMultiplePCRProducts, hasNoPCRProduct, analyzePrimerPairProperties } from '../../src/scientific/pcr';
import type { Primer } from '../../src/domain/primer';
import { DEMO_GENBANK } from '../../src/data/demo-workspace';
import { importGenBank } from '../../src/import/genbank';
import { reverseComplementIupac } from '../../src/scientific/restriction-analysis';

const makePrimer = (id: string, seq: string): Primer => ({
  id,
  name: id.toUpperCase(),
  sequence: seq.toUpperCase()
});

describe('PCR linear semantics', () => {
  it('basic linear PCR', () => {
    // seq: AAAA ATGC ---- CCAT AAAA
    // fwd: ATGC (+1)
    // rev: ATGG (matches CCAT as -1)
    const seq = 'AAAAATGCGGGGCCATAAAA';
    const fwd = makePrimer('f1', 'ATGC');
    const rev = makePrimer('r1', 'ATGG');
    
    const result = simulatePCR({ sequence: seq, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
    
    expect(isUniquePCRProduct(result)).toBe(true);
    const prod = result.products[0];
    
    expect(prod.lengthBp).toBe(12);
    expect(prod.segments[0].start0).toBe(4);
    expect(prod.segments[0].end0Exclusive).toBe(16);
    expect(prod.sequence).toBe('ATGCGGGGCCAT');
    expect(prod.sequence.length).toBe(prod.lengthBp);
  });

  it('linear outward-facing pair rejected', () => {
    // seq: AAAA CCAT ---- ATGC AAAA
    // fwd: ATGC. +1 at 14.
    // rev: ATGG. matches CCAT at 4. -1 at 4.
    // +1 is at 14, -1 is at 4. Outward facing!
    const seq = 'AAAACCATGGGGATGCAAAA';
    const fwd = makePrimer('f1', 'ATGC');
    const rev = makePrimer('r1', 'ATGG');
    
    const result = simulatePCR({ sequence: seq, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
    expect(hasNoPCRProduct(result)).toBe(true);
  });

  it('same-direction pair rejected', () => {
    const seq = 'AAAAATGCGGGGATGCAAAA';
    // fwd: ATGC (+1 at 4, +1 at 12)
    // rev: GGCC (+1 at 8)
    const fwd = makePrimer('f1', 'ATGC');
    const rev = makePrimer('r1', 'GGCC');
    
    const result = simulatePCR({ sequence: seq, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
    expect(hasNoPCRProduct(result)).toBe(true);
  });

  it('adjacent primers', () => {
    const seq = 'ATGCCAT'; // length 7. Wait, ATGC is 4, CCAT is 4. ATGCCAT is 7. 
    // Wait, ATGC starts at 0. CCAT starts at 3.
    // Let's use ATGC and CCAT adjacent: ATGCCAT length 7? No, ATGC CCAT is 8.
    const seq2 = 'ATGCCCAT';
    const fwd = makePrimer('f1', 'ATGC');
    const rev = makePrimer('r1', 'ATGG'); 
    
    const result = simulatePCR({ sequence: seq2, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
    expect(isUniquePCRProduct(result)).toBe(true);
    expect(result.products[0].lengthBp).toBe(8);
  });

  it('overlapping-primer semantics', () => {
    const seq = 'ATGCCAT'; 
    const fwd = makePrimer('f1', 'ATGC');
    const rev = makePrimer('r1', 'ATGG'); 
    // ATGC (0 to 4).
    // CCAT (3 to 7). rev match is -1.
    // +1 is at 0, 5' = 0, 3' = 3
    // -1 is at 3, 5' = 6, 3' = 3
    // product length = minus5 - plus5 + 1 = 6 - 0 + 1 = 7.
    const result = simulatePCR({ sequence: seq, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
    
    expect(isUniquePCRProduct(result)).toBe(true);
    expect(result.products[0].lengthBp).toBe(7);
  });

  it('multiple binding combinations & deterministic ordering', () => {
    // ATGC ATGC CCAT CCAT
    // +1 at 0, 4
    // -1 at 8, 12
    const seq = 'ATGCATGCCCATCCAT';
    const fwd = makePrimer('f1', 'ATGC');
    const rev = makePrimer('r1', 'ATGG');
    
    const result = simulatePCR({ sequence: seq, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
    expect(hasMultiplePCRProducts(result)).toBe(true);
    expect(getPCRProductCount(result)).toBe(4); // 0->8, 0->12, 4->8, 4->12
    
    // Ordered by length ascending
    expect(result.products[0].lengthBp).toBe(8); // 4->8 (4 to 11 = 8)
    expect(result.products[1].lengthBp).toBe(12); // 0->8 (0 to 11 = 12)
    expect(result.products[2].lengthBp).toBe(12); // 4->12 (4 to 15 = 12)
    expect(result.products[3].lengthBp).toBe(16); // 0->12 (0 to 15 = 16)
  });
});


  it('Primer A has both a +1 and -1 binding, Primer B has zero', () => {
    // Primer A: ATGC (RC is GCAT). It binds +1 and -1.
    const seq = 'AAAAATGCGGGGGCATAAAA';
    const fwd = makePrimer('f1', 'ATGC');
    const rev = makePrimer('r1', 'AGAG'); // no bindings
    
    const result = simulatePCR({ sequence: seq, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
    expect(hasNoPCRProduct(result)).toBe(true);
  });

  it('swapped physical orientation case', () => {
    // fwd primer binds -1, rev primer binds +1
    // Let's use seq = 'AAAA ATGC GGGG CCAT AAAA'
    // +1 binding at 4 (ATGC). 
    // -1 binding at 12 (CCAT).
    // Let's make fwd = ATGG (so it binds -1 at 12).
    // Let's make rev = ATGC (so it binds +1 at 4).
    const seq = 'AAAAATGCGGGGCCATAAAA';
    const fwd = makePrimer('f1', 'ATGG'); // RC is CCAT, binds at 12 (-1)
    const rev = makePrimer('r1', 'ATGC'); // binds at 4 (+1)
    
    const result = simulatePCR({ sequence: seq, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
    expect(isUniquePCRProduct(result)).toBe(true);
    
    const prod = result.products[0];
    expect(prod.forwardBinding.primerId).toBe('r1');
    expect(prod.reverseBinding.primerId).toBe('f1');
    expect(prod.forwardPrimerId).toBe('r1');
    expect(prod.reversePrimerId).toBe('f1');
  });

describe('PCR circular semantics', () => {
  it('circular origin-spanning PCR', () => {
    // seq: CCAT AAAA AAAA ATGC
    // fwd: ATGC (+1 at 12)
    // rev: ATGG (-1 at 0)
    // Inward facing across origin!
    const seq = 'CCATAAAAAAAAATGC'; // length 16
    const fwd = makePrimer('f1', 'ATGC');
    const rev = makePrimer('r1', 'ATGG');
    
    const result = simulatePCR({ sequence: seq, topology: 'circular', forwardPrimer: fwd, reversePrimer: rev });
    expect(isUniquePCRProduct(result)).toBe(true);
    
    const prod = result.products[0];
    expect(prod.wrapsOrigin).toBe(true);
    expect(prod.segments.length).toBe(2);
    expect(prod.segments[0].start0).toBe(12);
    expect(prod.segments[0].end0Exclusive).toBe(16);
    expect(prod.segments[1].start0).toBe(0);
    expect(prod.segments[1].end0Exclusive).toBe(4);
    
    expect(prod.lengthBp).toBe(8);
    expect(prod.sequence).toBe('ATGCCCAT');
  });
});

describe('pUC19 diagnostic', () => {
  const pUC19Doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
  const pUC19Seq = pUC19Doc.sequence.raw;

  it('pUC19 standard amplicon', () => {
    // 100-120: TGGCGTAATAGCGAAGAGGCCC
    const fwdPrimer = makePrimer('fwd', pUC19Seq.substring(99, 121));
    // 500-520: TCCGGCTCGTATGTTGTGTGGA
    const revPrimer = makePrimer('rev', reverseComplementIupac(pUC19Seq.substring(499, 521)));

    const result = simulatePCR({ sequence: pUC19Seq, topology: 'circular', forwardPrimer: fwdPrimer, reversePrimer: revPrimer });
    expect(isUniquePCRProduct(result)).toBe(true);
    
    const prod = result.products[0];
    expect(prod.lengthBp).toBe(422); // 521 - 99 = 422
    expect(prod.sequence.length).toBe(422);
    console.log(prod.sequence.substring(0, 20));
    expect(prod.sequence.startsWith('GTCAGG')).toBe(true);
    
    // Scientific invariant checks
    expect(prod.lengthBp).toBeGreaterThan(0);
    expect(prod.segments.reduce((acc, s) => acc + (s.end0Exclusive - s.start0), 0)).toBe(prod.lengthBp);
    expect(prod.forwardBinding.extensionDirection).toBe(1);
    expect(prod.reverseBinding.extensionDirection).toBe(-1);
  });

  it('pUC19 origin-spanning amplicon', () => {
    // pUC19 is 2686 bp.
    // +1 primer at 2500-2520
    const fwdPrimer = makePrimer('fwd', pUC19Seq.substring(2499, 2521));
    // -1 primer at 100-120
    const revPrimer = makePrimer('rev', reverseComplementIupac(pUC19Seq.substring(99, 121)));

    const result = simulatePCR({ sequence: pUC19Seq, topology: 'circular', forwardPrimer: fwdPrimer, reversePrimer: revPrimer });
    expect(isUniquePCRProduct(result)).toBe(true);
    
    const prod = result.products[0];
    expect(prod.wrapsOrigin).toBe(true);
    expect(prod.segments.length).toBe(2);
    
    // length = (2686 - 2499) + 121 = 187 + 121 = 308
    expect(prod.lengthBp).toBe(308);
    expect(prod.sequence.length).toBe(308);
  });

  it('pUC19 non-binding primer case', () => {
    const fwdPrimer = makePrimer('fwd', pUC19Seq.substring(99, 121));
    const revPrimer = makePrimer('rev', 'AAAAAAAAAAAAAAAAAAAAAA');
    
    const result = simulatePCR({ sequence: pUC19Seq, topology: 'circular', forwardPrimer: fwdPrimer, reversePrimer: revPrimer });
    expect(hasNoPCRProduct(result)).toBe(true);
  });
});

describe('primer pair Tm/GC summary', () => {
  it('combines properties properly', () => {
    const props = analyzePrimerPairProperties('ATGCATGCATGCATGC', 'ATGCATGCATGCATGC');
    expect(props.forwardGcPercent).toBe(0.5);
    expect(props.reverseGcPercent).toBe(0.5);
    expect(props.tmDifference).toBe(0);
    expect(props.forwardTm).toBeGreaterThan(0);
  });
});
