import { reverseComplementIupac } from '../../src/scientific/restriction-analysis';
import { describe, it, expect } from 'vitest';
import { analyzePrimerProperties } from '../../src/scientific/primer-properties';
import { 
  analyzePrimerBindings,
  getPrimerThreePrimeCoordinate,
  getPrimerExtensionDirection,
  circularDistanceInDirection,
  isUniqueBinder,
  isMultipleBinder,
  isNonBinder,
  getForwardBindingsOnly,
  getReverseBindingsOnly
} from '../../src/scientific/primer-binding';
import type { Primer } from '../../src/domain/primer';
import { DEMO_GENBANK } from '../../src/data/demo-workspace';
import { importGenBank } from '../../src/import/genbank';

const makePrimer = (id: string, seq: string): Primer => ({
  id,
  name: id.toUpperCase(),
  sequence: seq.toUpperCase()
});

describe('primer scientific properties', () => {
  it('calculates length, GC%, and Tm', () => {
    const props = analyzePrimerProperties('ATGCATGCATGC');
    expect(props.length).toBe(12);
    expect(props.gcPercent).toBe(50); // 6 G/C out of 12 (50%)
    expect(props.meltingTemperature).toBeGreaterThan(0);
    expect(props.molecularWeight).toBeGreaterThan(0);
  });
});

describe('primer binding semantics', () => {
  it('forward exact binding', () => {
    const seq = 'AAAATGCGGGG';
    const primer = makePrimer('p1', 'ATGC');
    const bindings = analyzePrimerBindings(seq, 'linear', primer);
    
    expect(bindings.length).toBe(1);
    const b = bindings[0];
    expect(b.orientation).toBe('forward');
    expect(b.extensionDirection).toBe(1);
    expect(b.start0).toBe(3);
    expect(b.end0Exclusive).toBe(7);
    expect(b.fivePrimeBase0).toBe(3);
    expect(b.threePrimeBase0).toBe(6);
    expect(b.wrapsOrigin).toBe(false);
    expect(b.matchedReferenceSequence).toBe('ATGC');
    
    expect(getPrimerThreePrimeCoordinate(b)).toBe(6);
    expect(getPrimerExtensionDirection(b)).toBe(1);
  });

  it('reverse exact binding', () => {
    const seq = 'AAAATGCGGGG';
    // Primer is GCAT, reverse complement is ATGC
    const primer = makePrimer('p1', 'GCAT');
    const bindings = analyzePrimerBindings(seq, 'linear', primer);
    
    expect(bindings.length).toBe(1);
    const b = bindings[0];
    expect(b.orientation).toBe('reverse');
    expect(b.extensionDirection).toBe(-1);
    expect(b.start0).toBe(3);
    expect(b.end0Exclusive).toBe(7);
    expect(b.fivePrimeBase0).toBe(6);
    expect(b.threePrimeBase0).toBe(3);
    expect(b.matchedReferenceSequence).toBe('ATGC'); // Found sequence is ATGC on top strand
    
    expect(getPrimerThreePrimeCoordinate(b)).toBe(3);
    expect(getPrimerExtensionDirection(b)).toBe(-1);
  });

  it('no binding', () => {
    const bindings = analyzePrimerBindings('AAAA', 'linear', makePrimer('p1', 'CCCC'));
    expect(isNonBinder(bindings)).toBe(true);
    expect(bindings.length).toBe(0);
  });

  it('multiple forward binding sites', () => {
    const bindings = analyzePrimerBindings('ATGC---ATGC', 'linear', makePrimer('p1', 'ATGC'));
    expect(isMultipleBinder(bindings)).toBe(true);
    expect(bindings.length).toBe(2);
    expect(bindings[0].start0).toBe(0);
    expect(bindings[1].start0).toBe(7);
  });

  it('forward + reverse sites', () => {
    // ATGC...GCAT
    // Primer ATGC will bind forward at 0, reverse at 7
    const bindings = analyzePrimerBindings('ATGC---GCAT', 'linear', makePrimer('p1', 'ATGC'));
    expect(bindings.length).toBe(2);
    
    expect(getForwardBindingsOnly(bindings).length).toBe(1);
    expect(getReverseBindingsOnly(bindings).length).toBe(1);
    
    expect(bindings[0].orientation).toBe('forward');
    expect(bindings[0].start0).toBe(0);
    
    expect(bindings[1].orientation).toBe('reverse');
    expect(bindings[1].start0).toBe(7);
    expect(bindings[1].threePrimeBase0).toBe(7);
  });

  it('palindromic primer orientation behavior', () => {
    // GAATTC is a palindrome. RC(GAATTC) = GAATTC.
    const bindings = analyzePrimerBindings('---GAATTC---', 'linear', makePrimer('p1', 'GAATTC'));
    // Should bind once forward and once reverse at the exact same location
    expect(bindings.length).toBe(2);
    
    expect(bindings[0].start0).toBe(3);
    expect(bindings[0].orientation).toBe('forward');
    
    expect(bindings[1].start0).toBe(3);
    expect(bindings[1].orientation).toBe('reverse');
  });

  it('linear origin-spanning pattern rejected', () => {
    // TGC at end, A at start. Primer ATGC.
    // If linear, it shouldn't match.
    const bindings = analyzePrimerBindings('A----TGC', 'linear', makePrimer('p1', 'TGCA'));
    expect(bindings.length).toBe(0);
  });

  it('circular origin-spanning binding accepted', () => {
    const bindings = analyzePrimerBindings('A----TGA', 'circular', makePrimer('p1', 'TGAA'));
    expect(bindings.length).toBe(1);
    const b = bindings[0];
    expect(b.wrapsOrigin).toBe(true);
    expect(b.start0).toBe(5);
    expect(b.end0Exclusive).toBe(1); // 8 is length. starts at 5, length 4. 5->6->7->0
    
    expect(b.segments.length).toBe(2);
    expect(b.segments[0].start0).toBe(5);
    expect(b.segments[0].end0Exclusive).toBe(8);
    expect(b.segments[1].start0).toBe(0);
    expect(b.segments[1].end0Exclusive).toBe(1);
    
    expect(b.threePrimeBase0).toBe(0); // 5, 6, 7, 0. Last base is 0.
  });

  it('IUPAC primer matching', () => {
    // R = A or G. Y = C or T. N = any.
    // Primer: RYN
    // ATGC -> A is R (yes), T is Y (yes), G is N (yes).
    const primer = makePrimer('p1', 'RYN');
    const bindings = analyzePrimerBindings('ATG', 'linear', primer);
    expect(bindings.length).toBe(1);
    expect(bindings[0].matchedReferenceSequence).toBe('ATG');
  });

  it('deterministic ordering', () => {
    // start0 -> orientation -> primerId
    const b1 = analyzePrimerBindings('ATGCATGC', 'linear', makePrimer('p2', 'ATGC'));
    const b2 = analyzePrimerBindings('ATGCATGC', 'linear', makePrimer('p1', 'ATGC'));
    
    const combined = [...b1, ...b2];
    // sort them as they would be if they were searched together
    combined.sort((a, b) => {
      if (a.start0 !== b.start0) return a.start0 - b.start0;
      if (a.orientation !== b.orientation) return a.orientation.localeCompare(b.orientation);
      return a.primerId.localeCompare(b.primerId);
    });
    
    expect(combined[0].primerId).toBe('p1');
    expect(combined[0].start0).toBe(0);
    expect(combined[1].primerId).toBe('p2');
    expect(combined[1].start0).toBe(0);
  });
});

describe('circularDistanceInDirection', () => {
  it('forward direction', () => {
    expect(circularDistanceInDirection(5, 8, 1, 10)).toBe(3);
    expect(circularDistanceInDirection(8, 2, 1, 10)).toBe(4);
  });

  it('reverse direction', () => {
    expect(circularDistanceInDirection(8, 5, -1, 10)).toBe(3);
    expect(circularDistanceInDirection(2, 8, -1, 10)).toBe(4);
  });
});

describe('pUC19 diagnostic', () => {
  const pUC19Doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
  const pUC19Seq = pUC19Doc.sequence.raw;

  // Let's pick a forward primer from somewhere in pUC19.
  // Bases 100-120: TGGCGTAATAGCGAAGAGGCCC
  const fwdPrimer = makePrimer('fwd', pUC19Seq.substring(99, 121));
  
  // Pick a reverse primer. Let's take bases 200-220 and reverse complement it.
  // bases: CGGCCACGATGCGTCCGGCGT
  // RC: ACGCCGGACGCATCGTGGCCG
  const revPrimer = makePrimer('rev', reverseComplementIupac(pUC19Seq.substring(199, 220)));
  
  const nonBinder = makePrimer('none', 'AAAAAAAAAAAAAAAAAAAAA'); // unlikely to bind exactly 21 A's in pUC19
  
  it('forward primer binds uniquely', () => {
    const bindings = analyzePrimerBindings(pUC19Seq, 'circular', fwdPrimer);
    expect(isUniqueBinder(bindings)).toBe(true);
    const b = bindings[0];
    expect(b.orientation).toBe('forward');
    expect(b.start0).toBe(99); // 1-based 100 is 0-based 99
    expect(b.end0Exclusive).toBe(121);
    expect(b.threePrimeBase0).toBe(120);
    
    const props = analyzePrimerProperties(fwdPrimer.sequence);
    expect(props.gcPercent).toBeCloseTo(72.7, 1);
  });

  it('reverse primer binds uniquely', () => {
    const bindings = analyzePrimerBindings(pUC19Seq, 'circular', revPrimer);
    expect(isUniqueBinder(bindings)).toBe(true);
    const b = bindings[0];
    expect(b.orientation).toBe('reverse');
    expect(b.start0).toBe(199);
    expect(b.end0Exclusive).toBe(220);
    expect(b.threePrimeBase0).toBe(199);
  });

  it('non-binder', () => {
    const bindings = analyzePrimerBindings(pUC19Seq, 'circular', nonBinder);
    expect(isNonBinder(bindings)).toBe(true);
  });
});
