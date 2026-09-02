import { describe, expect, it } from 'vitest';
import type { Feature } from '../../../src/domain/feature';
import { circularArcPath, circularPoint, clientPointToCircularCoordinate, clusterCircularRestrictionSites, createDirectionalCircularArcGeometry, featureMidpoint0, localPointToCircularCoordinate, placeCircularFeatureLabels, resolveScreenCircularDragRange } from '../../../src/components/map/circular-map-2d-geometry';

function feature(id: string, start0: number, end0Exclusive: number): Feature {
  return { id, name: id, type: 'CDS', strand: 1, segments: [{ start0, end0Exclusive }], qualifiers: {}, source: 'manual' };
}

describe('2D circular editor geometry', () => {
  it('maps the origin to 12 o’clock and advances clockwise', () => {
    expect(circularPoint(0, 100, 100)).toEqual({ x: 360, y: 260 });
    expect(circularPoint(25, 100, 100).x).toBeCloseTo(460);
    expect(circularPoint(25, 100, 100).y).toBeCloseTo(360);
  });

  it('creates a stable full-circle path and resolves wrapped feature midpoints', () => {
    expect(circularArcPath({ start0: 0, end0Exclusive: 100 }, 100, 50)).toContain('A 50 50 0 1 1');
    const wrapped = { ...feature('wrapped', 80, 100), segments: [{ start0: 80, end0Exclusive: 100 }, { start0: 0, end0Exclusive: 20 }] };
    expect(featureMidpoint0(wrapped, 100)).toBe(0);
  });

  it('places colliding labels deterministically with minimum separation', () => {
    const features = [feature('a', 1, 3), feature('b', 2, 4), feature('c', 3, 5)];
    const first = placeCircularFeatureLabels(features, 100);
    expect(placeCircularFeatureLabels(features, 100)).toEqual(first);
    const sortedY = first.map(item => item.y).sort((a, b) => a - b);
    expect(sortedY[1] - sortedY[0]).toBeGreaterThanOrEqual(22);
    expect(sortedY[2] - sortedY[1]).toBeGreaterThanOrEqual(22);
  });

  it('inverts letterboxed SVG geometry in rectangular editor panels', () => {
    const bounds = { left: 10, top: 20, width: 1000, height: 720 } as DOMRect;
    expect(clientPointToCircularCoordinate(510, 20, bounds, 360).coordinate0).toBe(0);
    expect(clientPointToCircularCoordinate(870, 380, bounds, 360).coordinate0).toBe(90);
  });

  it('selects the stroke that was actually drawn in either direction', () => {
    expect(resolveScreenCircularDragRange(10, 30, Math.PI / 3, 120)).toEqual({ start0: 10, end0Exclusive: 30 });
    expect(resolveScreenCircularDragRange(30, 10, -Math.PI / 3, 120)).toEqual({ start0: 10, end0Exclusive: 30 });
  });

  it('keeps local SVG pointer geometry valid while the viewBox is zoomed', () => {
    expect(localPointToCircularCoordinate(360, 200, 360)).toEqual({ coordinate0: 0, angle: 0 });
    expect(localPointToCircularCoordinate(520, 360, 360).coordinate0).toBe(90);
  });

  it('clusters dense restriction marks instead of drawing detached overlapping slashes', () => {
    const site = (id: string, coordinate0: number) => ({ id, enzymeId: id, enzymeName: id, start0: coordinate0, end0Exclusive: coordinate0 + 1, strand: 1 as const, recognitionSequence: 'A', forwardCut0: coordinate0, reverseCut0: coordinate0 });
    const clusters = clusterCircularRestrictionSites([site('a', 10), site('b', 12), site('c', 60)], 360);
    expect(clusters.map(cluster => cluster.sites.map(item => item.id))).toEqual([['a', 'b'], ['c']]);
  });

  it('shortens the ribbon body so a strand-aligned arrowhead owns the endpoint', () => {
    const forward = feature('forward', 10, 30);
    const geometry = createDirectionalCircularArcGeometry(forward, 0, 100, 180, 10);
    expect(geometry.terminal).toBe('clockwise-arrow');
    expect(geometry.bodyInterval.start0).toBe(10);
    expect(geometry.bodyInterval.end0Exclusive).toBeLessThan(30);
    expect(geometry.arrowPoints?.[0]).toEqual(circularPoint(30, 100, 180));
    expect(geometry.arrowPoints).toHaveLength(3);
  });
});
