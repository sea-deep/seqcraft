import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Feature } from '../../src/domain/feature';
import type { SequenceDocument } from '../../src/domain/document';
import { FeatureSegment } from '../../src/components/sequence/FeatureSegment';
import { PrimerTrack } from '../../src/components/sequence/PrimerTrack';
import { OrfTrack } from '../../src/components/sequence/OrfTrack';
import { LinearMap } from '../../src/components/map/LinearMap';
import { CircularDiffMap2D } from '../../src/components/compare/CircularDiffMap2D';
import { createCircularDiffGeometry } from '../../src/geometry/circular-diff-geometry';
import { diffBiologicalSequences } from '../../src/scientific/biological-sequence-diff';
import type { PrimerBindingMatch } from '../../src/domain/primer';
import type { OpenReadingFrame } from '../../src/scientific/orf';

describe('Arrowhead Rendering & Visual Layout Tests', () => {
  const baseFeature: Feature = {
    id: 'f1',
    name: 'AmpR',
    type: 'resistance marker',
    strand: 1,
    segments: [{ start0: 10, end0Exclusive: 30 }],
    qualifiers: {},
    source: 'manual',
  };

  describe('FeatureSegment in SequenceViewer', () => {
    it('renders a right-pointing arrow on forward feature at its 3\' terminus', () => {
      const { container } = render(
        <FeatureSegment
          feature={baseFeature}
          segment={baseFeature.segments[0]}
          segmentIndex={0}
          sequenceLength={100}
          isSelected={false}
          onClick={() => {}}
          startIdx={10}
          endIdxExclusive={30}
          trackIndex={0}
          showLabel={true}
          lineStartIndex={0}
        />
      );

      const outer = container.querySelector('[style*="clip-path"]');
      expect(outer).not.toBeNull();
      const style = outer?.getAttribute('style') ?? '';
      expect(style).toContain('100% 50%');
    });

    it('renders a flat rectangle without arrowhead on intermediate sliced chunks', () => {
      const { container } = render(
        <FeatureSegment
          feature={baseFeature}
          segment={baseFeature.segments[0]}
          segmentIndex={0}
          sequenceLength={100}
          isSelected={false}
          onClick={() => {}}
          startIdx={10}
          endIdxExclusive={20}
          trackIndex={0}
          showLabel={true}
          lineStartIndex={0}
        />
      );

      const outer = container.querySelector('[style*="clip-path"]');
      const style = outer?.getAttribute('style') ?? '';
      expect(style).toContain('clip-path: none');
    });

    it('renders arrow on reverse feature strictly at its 3\' start', () => {
      const reverseFeature: Feature = { ...baseFeature, strand: -1 };
      const { container } = render(
        <FeatureSegment
          feature={reverseFeature}
          segment={reverseFeature.segments[0]}
          segmentIndex={0}
          sequenceLength={100}
          isSelected={false}
          onClick={() => {}}
          startIdx={10}
          endIdxExclusive={30}
          trackIndex={0}
          showLabel={true}
          lineStartIndex={0}
        />
      );

      const outer = container.querySelector('[style*="clip-path"]');
      const style = outer?.getAttribute('style') ?? '';
      expect(style).toContain('0% 50%');
    });
  });

  describe('PrimerTrack in SequenceViewer', () => {
    const binding: PrimerBindingMatch = {
      primerId: 'p1',
      start0: 10,
      end0Exclusive: 30,
      orientation: 'forward',
      mismatches: 0,
      segments: [{ start0: 10, end0Exclusive: 30 }],
    };

    it('renders arrowhead only on 3\' terminus chunk', () => {
      const { container } = render(
        <PrimerTrack
          bindings={[{ primer: { id: 'p1', name: 'FWD_PRIMER', sequence: 'ATGC', lengthBases: 4, gcContent: 0.5, meltingTemperatureC: 55 }, binding, lineStart: 10, lineEndExclusive: 30, lane: 0 }]}
          lineStart0={0}
        />
      );

      const shell = container.querySelector('[style*="clip-path"]');
      expect(shell).not.toBeNull();
      const style = shell?.getAttribute('style') ?? '';
      expect(style).toContain('100% 50%');
    });

    it('renders flat continuous bar on non-terminal chunk', () => {
      const { container } = render(
        <PrimerTrack
          bindings={[{ primer: { id: 'p1', name: 'FWD_PRIMER', sequence: 'ATGC', lengthBases: 4, gcContent: 0.5, meltingTemperatureC: 55 }, binding, lineStart: 10, lineEndExclusive: 20, lane: 0 }]}
          lineStart0={0}
        />
      );

      const shell = container.querySelector('[style*="clip-path"]');
      const style = shell?.getAttribute('style') ?? '';
      expect(style).toContain('clip-path: none');
    });
  });

  describe('OrfTrack in SequenceViewer', () => {
    const orf: OpenReadingFrame = {
      id: 'orf-1',
      frame: 1,
      strand: 1,
      lengthBp: 60,
      protein: 'M'.repeat(20),
      segments: [{ start0: 0, end0Exclusive: 60 }],
    };

    it('renders directional arrowhead on ORF track at the 3\' end of forward reading frame', () => {
      const { container } = render(
        <OrfTrack
          orfs={[{ orf, lineStart: 0, lineEndExclusive: 60 }]}
          lineStart0={0}
        />
      );

      const shell = container.querySelector('[style*="clip-path"]');
      expect(shell).not.toBeNull();
      const style = shell?.getAttribute('style') ?? '';
      expect(style).toContain('100% 50%');
      expect(container.textContent).toContain('+1');
    });
  });

  describe('LinearMap SVG Arrowheads', () => {
    const document: SequenceDocument = {
      id: 'doc1',
      name: 'Test Plasmid',
      sequence: { raw: 'A'.repeat(500), alphabet: 'dna', length: 500, gcContent: 0 } as any,
      topology: 'circular',
      length: 500,
      alphabet: 'dna',
      circular: true,
      features: [
        {
          id: 'wrap-feat',
          name: 'Origin Spanning',
          type: 'gene',
          strand: 1,
          segments: [
            { start0: 450, end0Exclusive: 500 },
            { start0: 0, end0Exclusive: 50 },
          ],
          qualifiers: {},
          source: 'manual',
        },
      ],
      history: [],
      version: 1,
      storageMode: 'memory',
    };

    it('renders arrowhead only on the terminal segment of origin-spanning circular feature', () => {
      const { container } = render(<LinearMap document={document} />);
      const polygons = container.querySelectorAll('g.cursor-pointer polygon');
      expect(polygons.length).toBeGreaterThanOrEqual(2);

      const points0 = polygons[0].getAttribute('points')?.trim().split(/\s+/) ?? [];
      const points1 = polygons[1].getAttribute('points')?.trim().split(/\s+/) ?? [];
      expect(points0.length).toBe(4);
      expect(points1.length).toBe(5);
    });
  });

  describe('CircularDiffMap2D Geometry & Terminus Anchors', () => {
    it('correctly anchors query feature labels to the query track coordinates', () => {
      const refSeq = 'A'.repeat(1000);
      const qrySeq = 'A'.repeat(500);
      const result = diffBiologicalSequences(
        { id: 'ref', name: 'Ref', topology: 'circular', sequence: refSeq, features: [] },
        {
          id: 'qry',
          name: 'Qry',
          topology: 'circular',
          sequence: qrySeq,
          features: [
            {
              id: 'qfeat',
              name: 'QFeature',
              type: 'CDS',
              strand: 1,
              segments: [{ start0: 100, end0Exclusive: 200 }],
              qualifiers: {},
              source: 'manual',
            },
          ],
        }
      );

      const geometry = createCircularDiffGeometry(result);
      const label = geometry.labels.find(l => l.text.includes('QFeature'));
      expect(label).toBeDefined();

      const qFeatureArc = geometry.featureArcs.find(a => a.label === 'QFeature')!;
      const dx = label!.anchor.x - geometry.center.x;
      const dy = label!.anchor.y - geometry.center.y;
      const actualRadius = Math.round(Math.sqrt(dx * dx + dy * dy));
      expect(actualRadius).toBe(qFeatureArc.radius);
    });

    it('renders circular diff map with butt linecap on feature arrowheads and zoom controls', () => {
      const refSeq = 'A'.repeat(500);
      const qrySeq = 'A'.repeat(500);
      const result = diffBiologicalSequences(
        { id: 'ref', name: 'Ref', topology: 'circular', sequence: refSeq, features: [] },
        {
          id: 'qry',
          name: 'Qry',
          topology: 'circular',
          sequence: qrySeq,
          features: [
            {
              id: 'qfeat',
              name: 'QFeature',
              type: 'CDS',
              strand: 1,
              segments: [{ start0: 50, end0Exclusive: 150 }],
              qualifiers: {},
              source: 'manual',
            },
          ],
        }
      );

      const geometry = createCircularDiffGeometry(result);
      const { container } = render(<CircularDiffMap2D geometry={geometry} />);
      const arrowPath = container.querySelector('path[stroke-linecap="butt"]');
      expect(arrowPath).not.toBeNull();
      expect(container.querySelector('[aria-label="Zoom in"]')).not.toBeNull();
      expect(container.querySelector('[aria-label="Zoom out"]')).not.toBeNull();
      expect(container.querySelector('[aria-label="Reset zoom and pan"]')).not.toBeNull();
    });
  });
});
