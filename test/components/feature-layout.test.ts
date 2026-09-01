import { describe, it, expect } from 'vitest';
import { deduplicateFeaturesForDisplay } from '../../src/components/sequence/feature-layout';
import type { Feature } from '../../src/domain/feature';

describe('Feature Layout Deduplication', () => {
  it('deduplicates gene and CDS with exact same bounds and name, preferring CDS', () => {
    const f1: Feature = { id: '1', name: 'AmpR', type: 'gene', strand: -1, segments: [{start0: 100, end0Exclusive: 200}], qualifiers: {}, source: 'imported' };
    const f2: Feature = { id: '2', name: 'AmpR', type: 'CDS', strand: -1, segments: [{start0: 100, end0Exclusive: 200}], qualifiers: {}, source: 'imported' };
    
    const result = deduplicateFeaturesForDisplay([f1, f2]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('CDS');
  });

  it('keeps both if boundaries differ', () => {
    const f1: Feature = { id: '1', name: 'AmpR', type: 'gene', strand: -1, segments: [{start0: 100, end0Exclusive: 200}], qualifiers: {}, source: 'imported' };
    const f2: Feature = { id: '2', name: 'AmpR', type: 'CDS', strand: -1, segments: [{start0: 101, end0Exclusive: 200}], qualifiers: {}, source: 'imported' };
    
    const result = deduplicateFeaturesForDisplay([f1, f2]);
    expect(result).toHaveLength(2);
  });
});
