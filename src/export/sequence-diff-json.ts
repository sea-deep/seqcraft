import type { CanonicalSequence, SequenceDiffResult } from '../domain/sequence-diff';

export interface SequenceDiffJsonOptions {
  includeCanonicalSequences?: boolean;
  includeAlignment?: boolean;
  includeInputProvenance?: boolean;
  pretty?: boolean;
}

function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function exportFeature(feature: CanonicalSequence['features'][number], includeProvenance: boolean) {
  const { originalId, ...canonical } = feature;
  return { ...canonical, ...(includeProvenance ? { originalId } : {}) };
}

function exportSequence(sequence: CanonicalSequence, includeSequence: boolean, includeProvenance: boolean) {
  const { sequence: bases, id, name, orientation, rotation0, features, ...canonical } = sequence;
  return {
    ...canonical,
    features: features.map(feature => exportFeature(feature, includeProvenance)),
    sequenceChecksum: `fnv1a32:${checksum(bases)}`,
    ...(includeSequence ? { sequence: bases } : {}),
    ...(includeProvenance ? { id, name, orientation, rotation0 } : {}),
  };
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortJson(item)]));
  }
  return value;
}

export function createSequenceDiffManifest(result: SequenceDiffResult, options: SequenceDiffJsonOptions = {}) {
  const includeSequences = options.includeCanonicalSequences ?? false;
  const includeProvenance = options.includeInputProvenance ?? false;
  const differences = result.differences.map(difference => {
    const { referenceOriginalSegments, queryOriginalSegments, ...canonical } = difference;
    return { ...canonical, ...(includeProvenance ? { referenceOriginalSegments, queryOriginalSegments } : {}) };
  });
  const featureDifferences = result.featureDifferences.map(difference => ({
    ...difference,
    referenceFeature: difference.referenceFeature ? exportFeature(difference.referenceFeature, includeProvenance) : null,
    queryFeature: difference.queryFeature ? exportFeature(difference.queryFeature, includeProvenance) : null,
  }));
  return {
    schema: 'https://seqcraft.dev/schemas/sequence-diff/v1',
    schemaVersion: result.schemaVersion,
    id: result.id,
    coordinateSystem: result.coordinateSystem,
    exact: result.exact,
    identityPercent: result.identityPercent,
    editDistance: result.editDistance,
    matches: result.matches,
    canonicalization: result.canonicalization,
    representation: result.representation,
    reference: exportSequence(result.reference, includeSequences, includeProvenance),
    query: exportSequence(result.query, includeSequences, includeProvenance),
    differences,
    featureDifferences,
    proteinConsequences: result.proteinConsequences,
    ...(options.includeAlignment ? { alignedReference: result.alignedReference, alignedQuery: result.alignedQuery } : {}),
  };
}

export function sequenceDiffToJson(result: SequenceDiffResult, options: SequenceDiffJsonOptions = {}): string {
  return JSON.stringify(sortJson(createSequenceDiffManifest(result, options)), null, options.pretty === false ? undefined : 2);
}
