import { describe, it, expect } from 'vitest';
import { getSegmentTerminal } from '../../../src/components/map/feature-endpoints';
import type { Feature } from '../../../src/domain/feature';

describe('getSegmentTerminal', () => {
  const createFeature = (strand: 1 | -1, segments: {start0: number, end0Exclusive: number}[]): Feature => ({
    id: 'f', name: 'f', type: 'misc_feature', strand, segments, qualifiers: {}, source: 'imported'
  });

  describe('one-segment features', () => {
    it('returns clockwise-arrow for strand +1', () => {
      const f = createFeature(1, [{ start0: 10, end0Exclusive: 20 }]);
      expect(getSegmentTerminal(f, 0, 100)).toBe('clockwise-arrow');
    });

    it('returns counterclockwise-arrow for strand -1', () => {
      const f = createFeature(-1, [{ start0: 10, end0Exclusive: 20 }]);
      expect(getSegmentTerminal(f, 0, 100)).toBe('counterclockwise-arrow');
    });
  });

  describe('joined features (no wrap-around)', () => {
    it('strand +1 places arrow on the last physical segment', () => {
      // segments: [0] = 10-20, [1] = 30-40
      const f = createFeature(1, [{ start0: 10, end0Exclusive: 20 }, { start0: 30, end0Exclusive: 40 }]);
      expect(getSegmentTerminal(f, 0, 100)).toBe('none');
      expect(getSegmentTerminal(f, 1, 100)).toBe('clockwise-arrow');
    });

    it('strand -1 places arrow on the first physical segment', () => {
      const f = createFeature(-1, [{ start0: 10, end0Exclusive: 20 }, { start0: 30, end0Exclusive: 40 }]);
      expect(getSegmentTerminal(f, 0, 100)).toBe('counterclockwise-arrow');
      expect(getSegmentTerminal(f, 1, 100)).toBe('none');
    });
  });

  describe('origin-spanning features', () => {
    it('strand +1 places arrow on the segment after the origin', () => {
      // physical start: 90-100, physical end: 0-10
      // max gap is between 10 and 90 = 80.
      // S0 = 0-10, S1 = 90-100.
      const f = createFeature(1, [{ start0: 90, end0Exclusive: 100 }, { start0: 0, end0Exclusive: 10 }]);
      // index 0 is 90-100 (start), index 1 is 0-10 (end)
      expect(getSegmentTerminal(f, 0, 100)).toBe('none');
      expect(getSegmentTerminal(f, 1, 100)).toBe('clockwise-arrow');
    });

    it('strand -1 places arrow on the segment before the origin', () => {
      const f = createFeature(-1, [{ start0: 90, end0Exclusive: 100 }, { start0: 0, end0Exclusive: 10 }]);
      expect(getSegmentTerminal(f, 0, 100)).toBe('counterclockwise-arrow');
      expect(getSegmentTerminal(f, 1, 100)).toBe('none');
    });
  });
});
