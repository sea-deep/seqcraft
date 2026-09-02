import { describe, expect, it } from 'vitest';
import type { KnownFeatureDefinition } from '../../src/data/known-features';
import { detectKnownFeatures, matchToDetectedFeature } from '../../src/scientific/known-feature-detection';

const library: readonly KnownFeatureDefinition[] = [{
  id: 'fixture',
  name: 'Fixture feature',
  type: 'promoter',
  sequence: 'AAGTC',
  description: 'Test motif',
}];

describe('known-feature detection', () => {
  it('finds exact forward and reverse-strand matches', () => {
    const matches = detectKnownFeatures('CCAAGTCGGGACTTAA', 'linear', [], library);
    expect(matches.map(match => ({ start0: match.segments[0].start0, strand: match.strand }))).toEqual([
      { start0: 2, strand: 1 },
      { start0: 9, strand: -1 },
    ]);
  });

  it('splits a circular origin-spanning match into canonical segments', () => {
    const matches = detectKnownFeatures('GTCGGGAA', 'circular', [], library);
    expect(matches[0].segments).toEqual([
      { start0: 6, end0Exclusive: 8 },
      { start0: 0, end0Exclusive: 3 },
    ]);
  });

  it('marks existing coordinates and creates a detected annotation', () => {
    const first = detectKnownFeatures('CCAAGTCGG', 'linear', [], library)[0];
    const feature = matchToDetectedFeature(first);
    const repeated = detectKnownFeatures('CCAAGTCGG', 'linear', [feature], library)[0];
    expect(repeated.alreadyAnnotated).toBe(true);
    expect(feature.source).toBe('detected');
    expect(feature.qualifiers.detection).toContain('Exact match');
  });
});
