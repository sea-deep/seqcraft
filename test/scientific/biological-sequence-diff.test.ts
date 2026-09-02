import { describe, expect, it } from 'vitest';
import type { Feature, SequenceInterval } from '../../src/domain/feature';
import type { BiologicalSequenceInput } from '../../src/domain/sequence-diff';
import { diffBiologicalSequences } from '../../src/scientific/biological-sequence-diff';
import { reverseComplementIupac } from '../../src/scientific/restriction-analysis';

function feature(id: string, name: string, type: Feature['type'], start0: number, end0Exclusive: number, strand: 1 | -1 = 1): Feature {
  return { id, name, type, strand, segments: [{ start0, end0Exclusive }], qualifiers: {}, source: 'manual' };
}

function input(id: string, sequence: string, topology: BiologicalSequenceInput['topology'] = 'linear', features: Feature[] = []): BiologicalSequenceInput {
  return { id, name: id, sequence, topology, features };
}

function rotateSegments(segments: SequenceInterval[], amount: number, length: number): SequenceInterval[] {
  return segments.flatMap(segment => {
    const size = segment.end0Exclusive - segment.start0;
    const start0 = (segment.start0 - amount + length) % length;
    return start0 + size <= length
      ? [{ start0, end0Exclusive: start0 + size }]
      : [{ start0, end0Exclusive: length }, { start0: 0, end0Exclusive: start0 + size - length }];
  });
}

function rotated(source: BiologicalSequenceInput, amount: number): BiologicalSequenceInput {
  return {
    ...source,
    id: `${source.id}-rotated`,
    sequence: source.sequence.slice(amount) + source.sequence.slice(0, amount),
    features: source.features.map(item => ({ ...item, segments: rotateSegments(item.segments, amount, source.sequence.length) })),
  };
}

function reverseComplemented(source: BiologicalSequenceInput): BiologicalSequenceInput {
  const length = source.sequence.length;
  return {
    ...source,
    id: `${source.id}-rc`,
    sequence: reverseComplementIupac(source.sequence),
    features: source.features.map(item => ({
      ...item,
      strand: item.strand === 1 ? -1 : 1,
      segments: item.segments.map(segment => ({ start0: length - segment.end0Exclusive, end0Exclusive: length - segment.start0 })),
    })),
  };
}

describe('biological sequence diff', () => {
  it('reports substitutions, insertions, and deletions as typed edits', () => {
    const substitution = diffBiologicalSequences(input('r', 'ACGT'), input('q', 'ATGT'));
    expect(substitution.differences).toMatchObject([{ kind: 'substitution', referenceBases: 'C', queryBases: 'T' }]);

    const insertion = diffBiologicalSequences(input('r', 'ACGT'), input('q', 'ACGTT'));
    expect(insertion.differences).toMatchObject([{ kind: 'insertion', referenceBases: '', queryBases: 'T' }]);

    const deletion = diffBiologicalSequences(input('r', 'ACGTT'), input('q', 'ACGT'));
    expect(deletion.differences).toMatchObject([{ kind: 'deletion', referenceBases: 'T', queryBases: '' }]);
    expect(substitution.exact).toBe(true);
  });

  it('is invariant to circular origin rotation, including annotation coordinates', () => {
    const reference = input('plasmid', 'TTGACCGTAACGATGC', 'circular', [feature('prom', 'P1', 'promoter', 2, 7)]);
    const result = diffBiologicalSequences(reference, rotated(reference, 11));
    expect(result.differences).toEqual([]);
    expect(result.featureDifferences).toEqual([]);
    expect(result.reference.sequence).toBe(result.query.sequence);
    expect(result.reference.features[0].segments).toEqual(result.query.features[0].segments);
    expect(result.representation).toMatchObject({ originChanged: true, moleculeIdentityUnchanged: true, topologyChanged: false });
  });

  it('is invariant to equivalent reverse-complement orientation', () => {
    const reference = input('plasmid', 'TTGACCGTAACGATGC', 'circular', [feature('cds', 'protein', 'CDS', 3, 12, -1)]);
    const result = diffBiologicalSequences(reference, reverseComplemented(reference));
    expect(result.differences).toEqual([]);
    expect(result.featureDifferences).toEqual([]);
    expect(result.reference.sequence).toBe(result.query.sequence);
    expect(result.reference.features[0].strand).toBe(result.query.features[0].strand);
    expect(result.representation).toMatchObject({ orientationChanged: true, moleculeIdentityUnchanged: true });
  });

  it('detects edits adjacent to a circular canonical boundary', () => {
    const reference = input('r', 'AAAACCCCGGGGTTTA', 'circular');
    const query = input('q', 'AAAATCCCCGGGGTTTA', 'circular');
    const result = diffBiologicalSequences(reference, query);
    expect(result.differences.some(difference => difference.kind === 'insertion' && difference.queryBases === 'T')).toBe(true);
    expect(result.differences.every(difference => difference.referenceStart0 >= 0 && difference.referenceStart0 <= result.reference.length)).toBe(true);
  });

  it('diffs annotation addition, removal, coordinates, strand, and qualifiers', () => {
    const referenceFeatures = [
      { ...feature('same', 'promoter', 'promoter', 1, 5), qualifiers: { note: 'old' } },
      feature('removed', 'old tag', 'tag', 7, 10),
    ];
    const queryFeatures = [
      { ...feature('same', 'promoter', 'promoter', 2, 6, -1), qualifiers: { note: 'new' } },
      feature('added', 'new tag', 'tag', 9, 12),
    ];
    const result = diffBiologicalSequences(input('r', 'ACGTACGTACGTACGT', 'linear', referenceFeatures), input('q', 'ACGTACGTACGTACGT', 'linear', queryFeatures));
    expect(result.featureDifferences.map(item => item.kind)).toEqual(['modified', 'removed', 'added']);
    expect(result.featureDifferences[0].changes).toEqual(['coordinates', 'strand', 'qualifiers']);
    expect(result.featureDifferences[0].coordinateDelta).toMatchObject({ referenceStart0: 1, queryStart0: 2, shiftBp: 1, lengthDeltaBp: 0 });
  });

  it('reports missense, synonymous, and frameshift CDS consequences', () => {
    const cds = feature('cds', 'enzyme', 'CDS', 0, 12);
    const missense = diffBiologicalSequences(input('r', 'ATGGAATTTTAA', 'linear', [cds]), input('q', 'ATGGACTTTTAA', 'linear', [cds]));
    expect(missense.proteinConsequences[0].kinds).toContain('missense');
    expect(missense.proteinConsequences[0].firstAffectedAminoAcid1).toBe(2);

    const synonymous = diffBiologicalSequences(input('r', 'ATGGAATTTTAA', 'linear', [cds]), input('q', 'ATGGAGTTTTAA', 'linear', [cds]));
    expect(synonymous.proteinConsequences[0].kinds).toContain('synonymous');

    const extendedCds = feature('cds', 'enzyme', 'CDS', 0, 13);
    const frameshift = diffBiologicalSequences(input('r', 'ATGGAATTTTAA', 'linear', [cds]), input('q', 'ATGGAAATTTTAA', 'linear', [extendedCds]));
    expect(frameshift.proteinConsequences[0].kinds).toContain('frameshift');
  });

  it('pairs equivalent CDS annotations by biological identity when document-local IDs differ', () => {
    const referenceCds = feature('reference-cds-id', 'enzyme', 'CDS', 0, 12);
    const queryCds = feature('query-cds-id', 'enzyme', 'CDS', 0, 12);
    const result = diffBiologicalSequences(input('r', 'ATGGAATTTTAA', 'linear', [referenceCds]), input('q', 'ATGGACTTTTAA', 'linear', [queryCds]));
    expect(result.featureDifferences).toEqual([]);
    expect(result.reference.features[0].id).toBe(result.query.features[0].id);
    expect(result.proteinConsequences[0]).toMatchObject({ queryFeatureId: expect.stringMatching(/^canonical-feature-/), kinds: expect.arrayContaining(['missense']) });
  });

  it('returns deterministic IDs and structured original-coordinate mappings', () => {
    const reference = input('r', 'ACGTACGT', 'circular');
    const query = input('q', 'ACCTACGT', 'circular');
    const first = diffBiologicalSequences(reference, query);
    const second = diffBiologicalSequences(reference, query);
    expect(first).toEqual(second);
    expect(first.id).toMatch(/^seqdiff-[0-9a-f]{8}$/);
    expect(first.differences[0].referenceOriginalSegments.length).toBeGreaterThan(0);
  });

  it('keeps mutated circular diff semantics stable across independent rotations and reverse complementation', () => {
    const reference = input('r', 'GATTACAGGCTTACCGATGCTAGC', 'circular', [feature('gene', 'target', 'gene', 4, 17)]);
    const query = input('q', 'GATTACAGGCTAACCGATGCTAGC', 'circular', [feature('gene', 'target', 'gene', 4, 18)]);
    const baseline = diffBiologicalSequences(reference, query);
    const transformed = diffBiologicalSequences(rotated(reference, 7), reverseComplemented(rotated(query, 13)));
    const canonicalEdits = (result: ReturnType<typeof diffBiologicalSequences>) => result.differences.map(({ referenceOriginalSegments, queryOriginalSegments, ...difference }) => {
      void referenceOriginalSegments;
      void queryOriginalSegments;
      return difference;
    });
    expect(canonicalEdits(transformed)).toEqual(canonicalEdits(baseline));
    expect(transformed.featureDifferences.map(item => ({ kind: item.kind, changes: item.changes }))).toEqual(baseline.featureDifferences.map(item => ({ kind: item.kind, changes: item.changes })));
    expect(transformed.id).toBe(baseline.id);
  });

  it('handles a large mostly-identical molecule with bounded edit-distance work', () => {
    const sequence = `${'ACGT'.repeat(12_500)}GATTACA`;
    const query = `${sequence.slice(0, 25_000)}T${sequence.slice(25_001)}`;
    const result = diffBiologicalSequences(input('large-ref', sequence), input('large-query', query), { maxEditDistance: 32 });
    expect(result.exact).toBe(true);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0].kind).toBe('substitution');
  });
});
