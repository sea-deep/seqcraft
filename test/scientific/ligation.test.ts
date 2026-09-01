import { describe, it, expect } from 'vitest';
import { analyzeEndCompatibility } from '../../src/scientific/ligation';
import type { DigestEnd } from '../../src/domain/digest';

const makeEnd = (type: any, seq: string = ''): DigestEnd => ({
  type,
  fragmentSide: 'left',
  protrudingStrand: type === 'blunt' ? 'none' : 'forward',
  sequence: seq,
  overhangLength: seq.length,
  sites: [],
  isAmbiguousChemistry: false
});

describe('Ligation Compatibility', () => {
  it('blunt + blunt = compatible', () => {
    const a = makeEnd('blunt');
    const b = makeEnd('blunt');
    const res = analyzeEndCompatibility(a, b);
    expect(res.isCompatible).toBe(true);
    expect(res.compatibilityMode).toBe('blunt');
  });

  it('EcoRI cohesive ends (5 overhang, AATT) are compatible', () => {
    const a = makeEnd("5' overhang", "AATT");
    const b = makeEnd("5' overhang", "AATT");
    const res = analyzeEndCompatibility(a, b);
    expect(res.isCompatible).toBe(true);
    expect(res.compatibilityMode).toBe('sticky');
  });

  it('PstI cohesive ends (3 overhang, TGCA) are compatible', () => {
    const a = makeEnd("3' overhang", "TGCA");
    const b = makeEnd("3' overhang", "TGCA");
    const res = analyzeEndCompatibility(a, b);
    expect(res.isCompatible).toBe(true);
    expect(res.compatibilityMode).toBe('sticky');
  });

  it('HindIII cohesive ends (5 overhang, AGCT) are compatible', () => {
    const a = makeEnd("5' overhang", "AGCT");
    const b = makeEnd("5' overhang", "AGCT");
    const res = analyzeEndCompatibility(a, b);
    expect(res.isCompatible).toBe(true);
  });

  it('Synthetic non-palindromic (AGTC + GACT) are compatible', () => {
    const a = makeEnd("5' overhang", "AGTC");
    const b = makeEnd("5' overhang", "GACT");
    const res = analyzeEndCompatibility(a, b);
    expect(res.isCompatible).toBe(true);
  });

  it('5 overhang + 3 overhang = incompatible', () => {
    const a = makeEnd("5' overhang", "AATT");
    const b = makeEnd("3' overhang", "AATT");
    const res = analyzeEndCompatibility(a, b);
    expect(res.isCompatible).toBe(false);
  });

  it('Sticky mismatch', () => {
    const a = makeEnd("5' overhang", "AATT"); // EcoRI
    const b = makeEnd("5' overhang", "AGCT"); // HindIII
    const res = analyzeEndCompatibility(a, b);
    expect(res.isCompatible).toBe(false);
  });

  it('Sticky + blunt = incompatible', () => {
    const a = makeEnd("5' overhang", "AATT");
    const b = makeEnd("blunt");
    const res = analyzeEndCompatibility(a, b);
    expect(res.isCompatible).toBe(false);
  });

  it('Ambiguous chemistry', () => {
    const a = makeEnd("blunt");
    a.isAmbiguousChemistry = true;
    const b = makeEnd("blunt");
    const res = analyzeEndCompatibility(a, b);
    expect(res.isCompatible).toBe(false);
    expect(res.compatibilityMode).toBe('ambiguous');
  });
});
