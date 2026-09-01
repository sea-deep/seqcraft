import { describe, it, expect } from 'vitest';
import { assignRestrictionMapLanes } from '../../../src/components/map/restriction-map-layout';
import type { RestrictionSite } from '../../../src/scientific/restriction-analysis';

const makeSite = (forwardCut0: number, name: string): RestrictionSite => ({
  id: name,
  enzymeId: name.toLowerCase(),
  enzymeName: name,
  start0: forwardCut0,
  end0Exclusive: forwardCut0 + 6,
  strand: 1,
  recognitionSequence: 'AAAAAA',
  forwardCut0,
  reverseCut0: forwardCut0
});

describe('assignRestrictionMapLanes', () => {
  it('places isolated sites in lane 0', () => {
    const sites = [makeSite(0, 'A'), makeSite(1000, 'B')];
    const placed = assignRestrictionMapLanes(sites, 2000, 0.1);
    expect(placed.length).toBe(2);
    expect(placed[0].lane).toBe(0);
    expect(placed[1].lane).toBe(0);
  });

  it('bumps nearby sites to next lane', () => {
    // sequence length 1000. 10 bases is 0.01 * 2PI = 0.0628 radians.
    // So 10 bases with padding 0.1 radians WILL overlap.
    const sites = [makeSite(0, 'A'), makeSite(10, 'B')];
    const placed = assignRestrictionMapLanes(sites, 1000, 0.1);
    expect(placed[0].lane).toBe(0);
    expect(placed[1].lane).toBe(1);
  });

  it('handles a three-site cluster deterministically', () => {
    const sites = [makeSite(0, 'A'), makeSite(5, 'B'), makeSite(10, 'C')];
    const placed = assignRestrictionMapLanes(sites, 1000, 0.1);
    expect(placed.find(p => p.site.enzymeName === 'A')?.lane).toBe(0);
    expect(placed.find(p => p.site.enzymeName === 'B')?.lane).toBe(1);
    expect(placed.find(p => p.site.enzymeName === 'C')?.lane).toBe(2);
  });

  it('wraps around the origin properly', () => {
    // 995 and 5 are 10 bases apart. Overlap across origin!
    const sites = [makeSite(5, 'A'), makeSite(995, 'B')];
    const placed = assignRestrictionMapLanes(sites, 1000, 0.1);
    // Since it's sorted by coordinate, A (5) is first, B (995) is second.
    // Wait, B comes after A in the array, but they overlap across the origin.
    expect(placed[0].lane).toBe(0);
    expect(placed[1].lane).toBe(1);
  });
});

import { getRestrictionMarkerRadii } from '../../../src/components/map/restriction-map-layout';

describe('getRestrictionMarkerRadii', () => {
  it('keeps cutRadius invariant regardless of lane', () => {
    const base = 10;
    
    const r0 = getRestrictionMarkerRadii(base, 0, false);
    const r1 = getRestrictionMarkerRadii(base, 1, false);
    const r2 = getRestrictionMarkerRadii(base, 2, false);
    
    expect(r0.cutRadius).toBe(base);
    expect(r1.cutRadius).toBe(base);
    expect(r2.cutRadius).toBe(base);
  });

  it('extends outer marker end radius based on lane', () => {
    const base = 10;
    
    const r0 = getRestrictionMarkerRadii(base, 0, false);
    const r1 = getRestrictionMarkerRadii(base, 1, false);
    
    expect(r1.markerEndRadius).toBeGreaterThan(r0.markerEndRadius);
    expect(r1.markerStartRadius).toBe(base);
  });

  it('extends outer radius on hover/emphasis but leaves cutRadius invariant', () => {
    const base = 10;
    
    const normal = getRestrictionMarkerRadii(base, 0, false);
    const emphasized = getRestrictionMarkerRadii(base, 0, true);
    
    expect(emphasized.cutRadius).toBe(base);
    expect(emphasized.markerEndRadius).toBeGreaterThan(normal.markerEndRadius);
  });
});
