import { describe, expect, it } from 'vitest';
import type { Feature } from '../../src/domain/feature';
import type { BiologicalSequenceInput } from '../../src/domain/sequence-diff';
import { circularDiffGeometryToCanvasCommands } from '../../src/export/circular-diff-canvas';
import { circularDiffGeometryToSvg } from '../../src/export/circular-diff-svg';
import { createCircularDiffGeometry } from '../../src/geometry/circular-diff-geometry';
import { diffBiologicalSequences } from '../../src/scientific/biological-sequence-diff';

function feature(id: string, start0: number, end0Exclusive: number, strand: 1 | -1 = 1, segments?: Feature['segments']): Feature {
  return { id, name: id, type: 'CDS', strand, segments: segments ?? [{ start0, end0Exclusive }], qualifiers: {}, source: 'manual' };
}

function molecule(id: string, sequence: string, features: Feature[]): BiologicalSequenceInput {
  return { id, name: id, sequence, topology: 'circular', features };
}

describe('circular diff geometry', () => {
  const sequence = 'ACGTTGCAACCTGATCGTACGATCGGATCCAA';

  it('produces deterministic origin-aware feature and diff geometry', () => {
    const reference = molecule('ref', sequence, [feature('forward', 2, 12), feature('reverse', 15, 25, -1)]);
    const query = molecule('qry', `${sequence.slice(0, 8)}T${sequence.slice(9)}`, reference.features);
    const result = diffBiologicalSequences(reference, query);
    const first = createCircularDiffGeometry(result, { width: 800, height: 700 });
    const second = createCircularDiffGeometry(result, { width: 800, height: 700 });
    expect(first).toEqual(second);
    expect(first.width).toBe(800);
    expect(first.origin.angle).toBe(-Math.PI / 2);
    expect(first.featureArcs.map(arc => arc.strand)).toContain(-1);
    expect(first.differences.length).toBeGreaterThan(0);
  });

  it('splits wrapped features and allocates overlapping annotations to stable lanes', () => {
    const features = [
      feature('wrapped', 0, 0, 1, [{ start0: 29, end0Exclusive: sequence.length }, { start0: 0, end0Exclusive: 5 }]),
      feature('overlap-a', 2, 12),
      feature('overlap-b', 4, 14),
    ];
    const result = diffBiologicalSequences(molecule('ref', sequence, features), molecule('qry', sequence, features), { includeUnchangedFeatures: true });
    const geometry = createCircularDiffGeometry(result);
    expect(geometry.featureArcs.filter(arc => arc.label === 'wrapped')).toHaveLength(4);
    const referenceOverlapLanes = geometry.featureArcs.filter(arc => arc.molecule === 'reference' && arc.label.startsWith('overlap')).map(arc => arc.lane);
    expect(new Set(referenceOverlapLanes).size).toBe(2);
  });

  it('respects configurable radii and colors without mutating diff semantics', () => {
    const result = diffBiologicalSequences(molecule('ref', sequence, []), molecule('qry', `${sequence}A`, []));
    const original = JSON.stringify(result);
    const geometry = createCircularDiffGeometry(result, { backboneRadius: 91, referenceTrackRadius: 120, queryTrackRadius: 70, differenceTrackRadius: 95, colors: { insertion: '#123456' } });
    expect(geometry.backbone.radius).toBe(91);
    expect(geometry.differences.find(item => item.kind === 'insertion')?.color).toBe('#123456');
    expect(JSON.stringify(result)).toBe(original);
  });

  it('places labels deterministically without vertical collisions and caps large label sets', () => {
    const features = Array.from({ length: 40 }, (_, index) => feature(`feature-${index.toString().padStart(2, '0')}`, index % sequence.length, Math.min(sequence.length, index % sequence.length + 2)));
    const result = diffBiologicalSequences(molecule('ref', sequence, features), molecule('qry', sequence, []));
    const geometry = createCircularDiffGeometry(result, { maxLabels: 12, height: 500, labelLineHeight: 18 });
    expect(geometry.labels).toHaveLength(12);
    expect(geometry.metrics.hiddenLabelCount).toBe(28);
    for (const side of ['left', 'right'] as const) {
      const labels = geometry.labels.filter(label => label.side === side).sort((a, b) => a.position.y - b.position.y);
      for (let index = 1; index < labels.length; index++) expect(labels[index].position.y - labels[index - 1].position.y).toBeGreaterThanOrEqual(18);
    }
  });

  it('exports stable SVG and canvas command representations', () => {
    const result = diffBiologicalSequences(molecule('ref', sequence, [feature('cds', 3, 18)]), molecule('qry', `${sequence.slice(0, 10)}A${sequence.slice(10)}`, [feature('cds', 3, 19)]));
    const geometry = createCircularDiffGeometry(result, { width: 640, height: 640 });
    const svg = circularDiffGeometryToSvg(geometry);
    const commands = circularDiffGeometryToCanvasCommands(geometry);
    expect(svg).toContain('<svg');
    expect(svg).toContain('canonical circular sequence difference map');
    expect(svg).toContain('data-diff-kind=');
    expect(commands[0]).toMatchObject({ kind: 'arc', id: 'backbone' });
    expect(commands.some(command => command.kind === 'label')).toBe(true);
    expect(circularDiffGeometryToSvg(geometry)).toBe(svg);
  });

  it('keeps snapshot geometry stable when equivalent inputs rotate or reverse-complement', async () => {
    const { reverseComplementIupac } = await import('../../src/scientific/restriction-analysis');
    const reference = molecule('ref', sequence, [feature('cds', 4, 20)]);
    const query = molecule('qry', `${sequence.slice(0, 11)}T${sequence.slice(12)}`, [feature('cds', 4, 20)]);
    const rotate = (source: BiologicalSequenceInput, amount: number): BiologicalSequenceInput => ({ ...source, sequence: source.sequence.slice(amount) + source.sequence.slice(0, amount), features: source.features.map(item => ({ ...item, segments: item.segments.flatMap(segment => { const size = segment.end0Exclusive - segment.start0; const start0 = (segment.start0 - amount + source.sequence.length) % source.sequence.length; return start0 + size <= source.sequence.length ? [{ start0, end0Exclusive: start0 + size }] : [{ start0, end0Exclusive: source.sequence.length }, { start0: 0, end0Exclusive: start0 + size - source.sequence.length }]; }) })) });
    const rotatedReference = rotate(reference, 7);
    const rotatedQuery = rotate(query, 19);
    const length = rotatedQuery.sequence.length;
    const reverseQuery: BiologicalSequenceInput = { ...rotatedQuery, sequence: reverseComplementIupac(rotatedQuery.sequence), features: rotatedQuery.features.map(item => ({ ...item, strand: item.strand === 1 ? -1 : 1, segments: item.segments.map(segment => ({ start0: length - segment.end0Exclusive, end0Exclusive: length - segment.start0 })) })) };
    const baseline = createCircularDiffGeometry(diffBiologicalSequences(reference, query));
    const transformed = createCircularDiffGeometry(diffBiologicalSequences(rotatedReference, reverseQuery));
    expect(transformed).toEqual(baseline);
  });

  it('reduces labels to the available collision-free vertical capacity', () => {
    const features = Array.from({ length: 30 }, (_, index) => feature(`dense-${index}`, index, index + 1));
    const result = diffBiologicalSequences(molecule('ref', sequence, features), molecule('qry', sequence, []));
    const geometry = createCircularDiffGeometry(result, { height: 120, labelMargin: 12, labelLineHeight: 18, maxLabels: 30 });
    const capacity = (Math.floor((120 - 24) / 18) + 1) * 2;
    expect(geometry.labels.length).toBeLessThanOrEqual(capacity);
    expect(geometry.metrics.hiddenLabelCount).toBe(30 - geometry.labels.length);
  });
});
