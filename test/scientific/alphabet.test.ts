import { describe, it, expect } from 'vitest';
import { inferAlphabet } from '../../src/scientific/alphabet';

describe('Alphabet Inference', () => {
  it('infers DNA when containing T but no U', () => {
    expect(inferAlphabet('ATGC')).toBe('DNA');
    expect(inferAlphabet('atgc')).toBe('DNA');
  });

  it('infers RNA when containing U but no T', () => {
    expect(inferAlphabet('AUGC')).toBe('RNA');
    expect(inferAlphabet('augc')).toBe('RNA');
  });

  it('infers MIXED when containing both T and U', () => {
    expect(inferAlphabet('ATGCU')).toBe('MIXED');
  });

  it('infers UNKNOWN for valid IUPAC with neither T nor U', () => {
    expect(inferAlphabet('AGCRYSWKMBDHVN')).toBe('UNKNOWN');
  });

  it('throws for invalid nucleotide characters', () => {
    expect(() => inferAlphabet('ATGCX')).toThrow();
    expect(() => inferAlphabet('ATGC123')).toThrow();
  });
});
