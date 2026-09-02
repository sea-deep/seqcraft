import { getFeatureLength } from '../domain/feature';
import type { Topology } from '../domain/document';
import type { CanonicalFeature, FeatureDifference } from '../domain/sequence-diff';

function stableQualifiers(qualifiers: CanonicalFeature['qualifiers']): string {
  return JSON.stringify(Object.entries(qualifiers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
}

function stableSegments(feature: CanonicalFeature): string {
  return feature.segments.map(segment => `${segment.start0}:${segment.end0Exclusive}`).join(',');
}

function featureStart(feature: CanonicalFeature): number {
  return feature.segments[0]?.start0 ?? 0;
}

function matchScore(reference: CanonicalFeature, query: CanonicalFeature): number {
  if (reference.originalId === query.originalId) return 1_000_000;
  if (reference.name.toLocaleLowerCase() !== query.name.toLocaleLowerCase() || reference.type !== query.type) return -1;
  const coordinateDistance = Math.abs(featureStart(reference) - featureStart(query));
  return 100_000 - coordinateDistance;
}

function compareFeatures(reference: CanonicalFeature, query: CanonicalFeature): FeatureDifference['changes'] {
  const changes: FeatureDifference['changes'] = [];
  if (reference.name !== query.name) changes.push('name');
  if (reference.type !== query.type) changes.push('type');
  if (stableSegments(reference) !== stableSegments(query)) changes.push('coordinates');
  if (reference.strand !== query.strand) changes.push('strand');
  if (stableQualifiers(reference.qualifiers) !== stableQualifiers(query.qualifiers)) changes.push('qualifiers');
  return changes;
}

function signedShift(referenceStart0: number, queryStart0: number, sequenceLength: number, topology: Topology): number {
  let shift = queryStart0 - referenceStart0;
  if (topology === 'circular' && sequenceLength > 0) {
    if (shift > sequenceLength / 2) shift -= sequenceLength;
    if (shift < -sequenceLength / 2) shift += sequenceLength;
  }
  return shift;
}

function coordinateDelta(
  reference: CanonicalFeature | null,
  query: CanonicalFeature | null,
  sequenceLength: number,
  topology: Topology,
): FeatureDifference['coordinateDelta'] {
  const referenceStart0 = reference ? featureStart(reference) : null;
  const queryStart0 = query ? featureStart(query) : null;
  return {
    referenceStart0,
    queryStart0,
    shiftBp: referenceStart0 === null || queryStart0 === null ? null : signedShift(referenceStart0, queryStart0, sequenceLength, topology),
    lengthDeltaBp: (query ? getFeatureLength(query) : 0) - (reference ? getFeatureLength(reference) : 0),
  };
}

export function diffFeatures(
  referenceFeatures: CanonicalFeature[],
  queryFeatures: CanonicalFeature[],
  includeUnchanged = false,
  context: { sequenceLength?: number; topology?: Topology } = {},
): FeatureDifference[] {
  const sequenceLength = context.sequenceLength ?? 0;
  const topology = context.topology ?? 'linear';
  const references = [...referenceFeatures].sort((left, right) => featureStart(left) - featureStart(right) || left.name.localeCompare(right.name) || left.originalId.localeCompare(right.originalId));
  const queries = [...queryFeatures].sort((left, right) => featureStart(left) - featureStart(right) || left.name.localeCompare(right.name) || left.originalId.localeCompare(right.originalId));
  const usedQueryIds = new Set<string>();
  const result: FeatureDifference[] = [];

  for (const reference of references) {
    const candidates = queries
      .filter(query => !usedQueryIds.has(query.id))
      .map(query => ({ query, score: matchScore(reference, query) }))
      .filter(candidate => candidate.score >= 0)
      .sort((left, right) => right.score - left.score || featureStart(left.query) - featureStart(right.query) || left.query.id.localeCompare(right.query.id));
    const query = candidates[0]?.query;
    if (!query) {
      result.push({ id: `feature:removed:${reference.id}`, kind: 'removed', referenceFeature: reference, queryFeature: null, changes: [], coordinateDelta: coordinateDelta(reference, null, sequenceLength, topology) });
      continue;
    }
    usedQueryIds.add(query.id);
    const changes = compareFeatures(reference, query);
    if (changes.length > 0 || includeUnchanged) {
      result.push({
        id: `feature:${changes.length === 0 ? 'unchanged' : 'modified'}:${reference.id}:${query.id}`,
        kind: changes.length === 0 ? 'unchanged' : 'modified',
        referenceFeature: reference,
        queryFeature: query,
        changes,
        coordinateDelta: coordinateDelta(reference, query, sequenceLength, topology),
      });
    }
  }

  for (const query of queries) {
    if (!usedQueryIds.has(query.id)) {
      result.push({ id: `feature:added:${query.id}`, kind: 'added', referenceFeature: null, queryFeature: query, changes: [], coordinateDelta: coordinateDelta(null, query, sequenceLength, topology) });
    }
  }

  const kindOrder: Record<FeatureDifference['kind'], number> = { modified: 0, removed: 1, added: 2, unchanged: 3 };
  return result.sort((left, right) => {
    const leftFeature = left.referenceFeature ?? left.queryFeature;
    const rightFeature = right.referenceFeature ?? right.queryFeature;
    return kindOrder[left.kind] - kindOrder[right.kind]
      || featureStart(leftFeature!) - featureStart(rightFeature!)
      || left.id.localeCompare(right.id);
  });
}
