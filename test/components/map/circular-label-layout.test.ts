import { describe, expect, it } from 'vitest';
import type { Feature } from '../../../src/domain/feature';
import {
  computeCircularLabelLayout,
  deduplicateFeaturesForLabels,
  getFeatureBiologicalPriority,
  bboxesCollide,
  circularAngularDelta
} from '../../../src/components/map/circular-label-layout';

function createFeature(
  id: string,
  name: string,
  type: string,
  start0: number,
  end0Exclusive: number,
  qualifiers: Record<string, string | string[]> = {}
): Feature {
  return {
    id,
    name,
    type: type as any,
    strand: 1,
    segments: [{ start0, end0Exclusive }],
    qualifiers,
    source: 'manual'
  };
}

describe('Collision-aware circular label layout engine', () => {
  it('prioritizes CDS and replication origins over minor regulatory elements', () => {
    const cds = createFeature('1', 'tet', 'CDS', 85, 1276);
    const signal = createFeature('2', '-35 signal', 'regulatory', 10, 16);
    const binding = createFeature('3', 'binding', 'misc_binding', 20, 24);

    expect(getFeatureBiologicalPriority(cds, false)).toBeGreaterThan(getFeatureBiologicalPriority(signal, false));
    expect(getFeatureBiologicalPriority(signal, false)).toBeGreaterThan(getFeatureBiologicalPriority(binding, false));
  });

  it('deduplicates co-extensive gene and CDS features to prevent label duplication', () => {
    const gene = createFeature('1', 'bla', 'gene', 3292, 4153);
    const cds = createFeature('2', 'bla', 'CDS', 3292, 4153);
    const result = deduplicateFeaturesForLabels([gene, cds]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('CDS');
  });

  it('distributes nearby labels into distinct outward radial lanes to avoid overlap', () => {
    // 3 features close to each other
    const f1 = createFeature('1', 'promoter P1', 'promoter', 26, 33);
    const f2 = createFeature('2', 'promoter P2', 'promoter', 42, 49);
    const f3 = createFeature('3', 'tet', 'CDS', 85, 1276);

    const labels = computeCircularLabelLayout([f1, f2, f3], 4361);
    expect(labels.length).toBeGreaterThanOrEqual(3);

    // Verify none of the placed bounding boxes overlap
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const collides = bboxesCollide(labels[i].bbox, labels[j].bbox, 0, 0);
        expect(collides).toBe(false);
      }
    }
  });

  it('collapses dense minor features into a cluster badge', () => {
    // 10 tiny binding sites crammed into 80 bp
    const denseFeatures: Feature[] = [];
    for (let i = 0; i < 10; i++) {
      denseFeatures.push(
        createFeature(`b${i}`, `site ${i}`, 'misc_binding', 4250 + i * 8, 4254 + i * 8, {
          bound_moiety: 'echinomycin'
        })
      );
    }
    // And 1 major CDS
    denseFeatures.push(createFeature('major', 'bla', 'CDS', 3292, 4153));

    const labels = computeCircularLabelLayout(denseFeatures, 4361);
    const clusters = labels.filter(l => l.kind === 'cluster');
    expect(clusters.length).toBeGreaterThanOrEqual(1);

    // The major CDS should be placed as a single label
    const singles = labels.filter(l => l.kind === 'single');
    expect(singles.some(s => s.displayName === 'bla')).toBe(true);
  });

  it('handles wrap-around across 0° / 360° seamlessly', () => {
    const angleNear0 = -Math.PI / 2 + 0.05; // just clockwise of 12 o clock
    const angleNear360 = -Math.PI / 2 - 0.05; // just counter-clockwise of 12 o clock
    const delta = circularAngularDelta(angleNear0, angleNear360);
    expect(delta).toBeCloseTo(0.1, 4);
  });

  it('keeps all labels inside viewport bounds (720x720 viewBox)', () => {
    const f1 = createFeature('top', 'promoter', 'promoter', 0, 50);
    const f2 = createFeature('bottom', 'tet', 'CDS', 2180, 2500);
    const f3 = createFeature('left', 'ori', 'origin', 1090, 1200);
    const f4 = createFeature('right', 'bla', 'CDS', 3270, 3600);

    const labels = computeCircularLabelLayout([f1, f2, f3, f4], 4361);
    for (const l of labels) {
      expect(l.bbox.x).toBeGreaterThanOrEqual(16);
      expect(l.bbox.x + l.bbox.width).toBeLessThanOrEqual(704);
      expect(l.bbox.y).toBeGreaterThanOrEqual(16);
      expect(l.bbox.y + l.bbox.height).toBeLessThanOrEqual(704);
    }
  });

  it('produces 100% deterministic layout across repeated executions', () => {
    const features = [
      createFeature('1', 'tet', 'CDS', 85, 1276),
      createFeature('2', 'promoter P1', 'promoter', 26, 33),
      createFeature('3', 'promoter P2', 'promoter', 42, 49),
      createFeature('4', 'bla', 'CDS', 3292, 4153),
      createFeature('5', 'pUC ori', 'origin', 2534, 2535)
    ];

    const run1 = computeCircularLabelLayout(features, 4361);
    const run2 = computeCircularLabelLayout(features, 4361);
    expect(run1).toEqual(run2);
  });

  it('lays out real pBR322 J01749.1 with zero text collisions and major features visible', async () => {
    const { importDocument } = await import('../../../src/import/normalize-document');
    const { PBR322_GENBANK_RECORD } = await import('../../fixtures/pbr322');

    const [doc] = importDocument(PBR322_GENBANK_RECORD);
    expect(doc.features.length).toBe(50);

    const labels = computeCircularLabelLayout(doc.features, doc.length);
    expect(labels.length).toBeGreaterThan(0);

    // Verify ZERO bounding box collisions between placed labels
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const collides = bboxesCollide(labels[i].bbox, labels[j].bbox, 0, 0);
        expect(collides, `Collision between "${labels[i].displayName}" and "${labels[j].displayName}"`).toBe(false);
      }
    }

    // Verify major features bla and tet are rendered cleanly as single labels
    const singles = labels.filter(l => l.kind === 'single') as any[];
    const singleNames = singles.map(s => s.displayName);
    expect(singleNames).toContain('bla');
    expect(singleNames).toContain('tet');

    // Verify clusters exist for dense minor features
    const clusters = labels.filter(l => l.kind === 'cluster');
    expect(clusters.length).toBeGreaterThanOrEqual(1);

    // Verify all labels are inside viewport bounds
    for (const l of labels) {
      expect(l.bbox.x).toBeGreaterThanOrEqual(16);
      expect(l.bbox.x + l.bbox.width).toBeLessThanOrEqual(704);
      expect(l.bbox.y).toBeGreaterThanOrEqual(16);
      expect(l.bbox.y + l.bbox.height).toBeLessThanOrEqual(704);
    }
  });

  it('lays out pUC19 circular record with zero text collisions', async () => {
    const { importDocument } = await import('../../../src/import/normalize-document');
    const { DEMO_GENBANK } = await import('../../../src/data/demo-workspace');

    const [doc] = importDocument(DEMO_GENBANK);
    expect(doc.name).toBe('pUC19');
    expect(doc.topology).toBe('circular');

    const labels = computeCircularLabelLayout(doc.features, doc.length);
    expect(labels.length).toBeGreaterThan(0);

    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const collides = bboxesCollide(labels[i].bbox, labels[j].bbox, 0, 0);
        expect(collides, `Collision between "${labels[i].displayName}" and "${labels[j].displayName}"`).toBe(false);
      }
    }
  });
});
