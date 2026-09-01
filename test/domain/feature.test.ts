import { describe, it, expect } from 'vitest';
import { validateInterval, getFeatureLength, Feature } from '../../src/domain/feature';

describe('Feature and Interval Rules', () => {
  it('validates a correct interval', () => {
    expect(() => validateInterval({ start0: 0, end0Exclusive: 10 }, 100)).not.toThrow();
  });

  it('allows an empty interval', () => {
    expect(() => validateInterval({ start0: 5, end0Exclusive: 5 }, 100)).not.toThrow();
  });

  it('rejects negative intervals', () => {
    expect(() => validateInterval({ start0: -1, end0Exclusive: 10 }, 100)).toThrow();
    expect(() => validateInterval({ start0: 5, end0Exclusive: -5 }, 100)).toThrow();
  });

  it('rejects end < start', () => {
    expect(() => validateInterval({ start0: 10, end0Exclusive: 5 }, 100)).toThrow();
  });

  it('rejects intervals exceeding sequence length', () => {
    expect(() => validateInterval({ start0: 5, end0Exclusive: 105 }, 100)).toThrow();
  });

  it('calculates total length of a single-segment feature', () => {
    const feature: Feature = {
      id: 'f1',
      name: 'Test',
      type: 'gene',
      strand: 1,
      segments: [{ start0: 10, end0Exclusive: 20 }],
      qualifiers: {},
      source: 'manual'
    };
    expect(getFeatureLength(feature)).toBe(10);
  });

  it('calculates total length of a multi-segment feature (e.g. crossing origin)', () => {
    const feature: Feature = {
      id: 'f1',
      name: 'Test',
      type: 'gene',
      strand: 1,
      segments: [
        { start0: 90, end0Exclusive: 100 },
        { start0: 0, end0Exclusive: 5 }
      ],
      qualifiers: {},
      source: 'manual'
    };
    expect(getFeatureLength(feature)).toBe(15);
  });
});
