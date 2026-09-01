import { describe, it, expect } from 'vitest';
import { assignFeatureLanes } from '../../../src/components/map/map-layout';
import type { Feature } from '../../../src/domain/feature';

describe('assignFeatureLanes', () => {
  const createMockFeature = (id: string, start0: number, end0Exclusive: number, type: any = 'misc_feature'): Feature => ({
    id,
    name: id,
    type,
    strand: 1,
    segments: [{ start0, end0Exclusive }],
    qualifiers: {},
    source: 'imported'
  });

  it('excludes source features', () => {
    const f1 = createMockFeature('f1', 0, 10, 'source');
    const f2 = createMockFeature('f2', 15, 20);
    const placed = assignFeatureLanes([f1, f2]);
    expect(placed).toHaveLength(1);
    expect(placed[0].feature.id).toBe('f2');
  });

  it('assigns overlapping features to different lanes', () => {
    const f1 = createMockFeature('f1', 0, 50);
    const f2 = createMockFeature('f2', 40, 60);
    const placed = assignFeatureLanes([f1, f2]);
    expect(placed).toHaveLength(2);
    const f1Lane = placed.find(p => p.feature.id === 'f1')?.lane;
    const f2Lane = placed.find(p => p.feature.id === 'f2')?.lane;
    expect(f1Lane).not.toBe(f2Lane);
  });

  it('reuses lanes for non-overlapping features', () => {
    const f1 = createMockFeature('f1', 0, 20);
    const f2 = createMockFeature('f2', 20, 40); // exactly adjacent
    const f3 = createMockFeature('f3', 10, 30);
    const placed = assignFeatureLanes([f1, f2, f3]);
    
    const f1Lane = placed.find(p => p.feature.id === 'f1')?.lane;
    const f2Lane = placed.find(p => p.feature.id === 'f2')?.lane;
    const f3Lane = placed.find(p => p.feature.id === 'f3')?.lane;
    
    // f1 and f2 don't overlap, they should share a lane if possible
    // f3 overlaps both, should be in a different lane
    expect(f1Lane).toBe(0);
    expect(f2Lane).toBe(0); // 20-40 doesn't overlap 0-20 (half-open)
    expect(f3Lane).toBe(1);
  });
});
