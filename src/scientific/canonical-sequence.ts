import type { Feature, SequenceInterval } from '../domain/feature';
import type {
  BiologicalSequenceInput,
  CanonicalFeature,
  CanonicalSequence,
  DiffOrientation,
} from '../domain/sequence-diff';
import { reverseComplementIupac } from './restriction-analysis';

function normalizeSequence(sequence: string): string {
  return sequence.replaceAll(/\s/g, '').toUpperCase().replaceAll('U', 'T');
}

/** Booth's algorithm: lexicographically least cyclic rotation in O(n). */
export function leastRotationIndex(value: string): number {
  const length = value.length;
  if (length < 2) return 0;
  const doubled = value + value;
  let left = 0;
  let right = 1;
  let offset = 0;
  while (left < length && right < length && offset < length) {
    const a = doubled.charCodeAt(left + offset);
    const b = doubled.charCodeAt(right + offset);
    if (a === b) {
      offset++;
      continue;
    }
    if (a > b) {
      left += offset + 1;
      if (left === right) left++;
    } else {
      right += offset + 1;
      if (left === right) right++;
    }
    offset = 0;
  }
  return Math.min(left, right) % length;
}

export function rotateSequence(sequence: string, rotation0: number): string {
  if (sequence.length === 0) return sequence;
  const normalized = ((rotation0 % sequence.length) + sequence.length) % sequence.length;
  return sequence.slice(normalized) + sequence.slice(0, normalized);
}

function rotateInterval(interval: SequenceInterval, rotation0: number, length: number): SequenceInterval[] {
  const intervalLength = interval.end0Exclusive - interval.start0;
  if (intervalLength <= 0) return [];
  const start0 = (interval.start0 - rotation0 + length) % length;
  const end0Exclusive = start0 + intervalLength;
  return end0Exclusive <= length
    ? [{ start0, end0Exclusive }]
    : [{ start0, end0Exclusive: length }, { start0: 0, end0Exclusive: end0Exclusive - length }];
}

function mergeSegments(segments: SequenceInterval[]): SequenceInterval[] {
  const sorted = [...segments].sort((a, b) => a.start0 - b.start0 || a.end0Exclusive - b.end0Exclusive);
  const merged: SequenceInterval[] = [];
  for (const segment of sorted) {
    const previous = merged.at(-1);
    if (previous && segment.start0 <= previous.end0Exclusive) {
      previous.end0Exclusive = Math.max(previous.end0Exclusive, segment.end0Exclusive);
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

function transformFeature(
  feature: Feature,
  length: number,
  topology: BiologicalSequenceInput['topology'],
  orientation: DiffOrientation,
  rotation0: number,
): CanonicalFeature {
  const oriented = feature.segments.map(segment => orientation === 'forward'
    ? { ...segment }
    : { start0: length - segment.end0Exclusive, end0Exclusive: length - segment.start0 });
  const segments = topology === 'circular'
    ? mergeSegments(oriented.flatMap(segment => rotateInterval(segment, rotation0, length)))
    : mergeSegments(oriented);
  return {
    ...feature,
    originalId: feature.id,
    strand: orientation === 'forward' ? feature.strand : feature.strand === 1 ? -1 : 1,
    segments,
  };
}

function stableValue(value: string | string[]): string {
  return Array.isArray(value) ? value.join('\u001f') : value;
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function featureSemanticSignature(feature: CanonicalFeature): string {
  const qualifiers = Object.entries(feature.qualifiers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${stableValue(value)}`)
    .join(';');
  return `${feature.name}|${feature.type}|${feature.strand}|${feature.segments.map(segment => `${segment.start0}:${segment.end0Exclusive}`).join(',')}|${qualifiers}`;
}

function stabilizeFeatureIds(features: CanonicalFeature[]): CanonicalFeature[] {
  const occurrences = new Map<string, number>();
  return [...features]
    .sort((left, right) => featureSemanticSignature(left).localeCompare(featureSemanticSignature(right)) || left.originalId.localeCompare(right.originalId))
    .map(feature => {
      const signature = featureSemanticSignature(feature);
      const occurrence = occurrences.get(signature) ?? 0;
      occurrences.set(signature, occurrence + 1);
      return { ...feature, id: `canonical-feature-${stableHash(signature)}-${occurrence}` };
    });
}

function featureSignature(features: CanonicalFeature[]): string {
  return [...features]
    .map(featureSemanticSignature)
    .sort((left, right) => left.localeCompare(right))
    .join('\u001e');
}

interface Candidate {
  sequence: string;
  orientation: DiffOrientation;
  rotation0: number;
  features: CanonicalFeature[];
  signature: string;
}

function makeCandidate(input: BiologicalSequenceInput, normalized: string, orientation: DiffOrientation, explicitRotation?: number): Candidate {
  const oriented = orientation === 'forward' ? normalized : reverseComplementIupac(normalized);
  const rotation0 = input.topology === 'circular' ? (explicitRotation ?? leastRotationIndex(oriented)) : 0;
  const sequence = input.topology === 'circular' ? rotateSequence(oriented, rotation0) : oriented;
  const features = stabilizeFeatureIds(input.features.map(feature => transformFeature(feature, normalized.length, input.topology, orientation, rotation0)));
  return { sequence, orientation, rotation0, features, signature: featureSignature(features) };
}

function circularKmer(sequence: string, start0: number, length: number): string {
  if (start0 + length <= sequence.length) return sequence.slice(start0, start0 + length);
  return sequence.slice(start0) + sequence.slice(0, start0 + length - sequence.length);
}

function candidateRotations(reference: string, orientedQuery: string): Map<number, number> {
  const minimumLength = Math.min(reference.length, orientedQuery.length);
  const votes = new Map<number, number>();
  if (minimumLength === 0) return votes;
  if (reference.length === orientedQuery.length) {
    const exactRotation = (orientedQuery + orientedQuery).indexOf(reference);
    if (exactRotation >= 0 && exactRotation < orientedQuery.length) {
      votes.set(exactRotation, Number.MAX_SAFE_INTEGER);
      return votes;
    }
  }
  const kmerLength = Math.min(21, Math.max(4, Math.floor(minimumLength / 10)));
  if (minimumLength < kmerLength) {
    for (let rotation0 = 0; rotation0 < orientedQuery.length; rotation0++) votes.set(rotation0, 0);
    return votes;
  }
  const referencePositions = new Map<string, number>();
  for (let position = 0; position < reference.length; position++) {
    const kmer = circularKmer(reference, position, kmerLength);
    referencePositions.set(kmer, referencePositions.has(kmer) ? -1 : position);
  }
  for (let position = 0; position < orientedQuery.length; position++) {
    const referencePosition = referencePositions.get(circularKmer(orientedQuery, position, kmerLength));
    if (referencePosition === undefined || referencePosition < 0) continue;
    const rotation0 = ((position - referencePosition) % orientedQuery.length + orientedQuery.length) % orientedQuery.length;
    votes.set(rotation0, (votes.get(rotation0) ?? 0) + 1);
  }
  return votes;
}

function positionalMatchCount(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  let matches = 0;
  for (let index = 0; index < length; index++) if (left.charCodeAt(index) === right.charCodeAt(index)) matches++;
  return matches;
}

function boundedMyersDistance(reference: string, query: string, maximum: number): number {
  if (Math.abs(reference.length - query.length) > maximum) return maximum + 1;
  const offset = maximum + 1;
  let previous = new Int32Array(maximum * 2 + 3);
  previous.fill(-1);
  previous[offset + 1] = 0;
  for (let depth = 0; depth <= maximum; depth++) {
    const current = new Int32Array(maximum * 2 + 3);
    current.fill(-1);
    for (let diagonal = -depth; diagonal <= depth; diagonal += 2) {
      let x = diagonal === -depth || (diagonal !== depth && previous[offset + diagonal - 1] < previous[offset + diagonal + 1])
        ? previous[offset + diagonal + 1]
        : previous[offset + diagonal - 1] + 1;
      let y = x - diagonal;
      while (x < reference.length && y < query.length && reference.charCodeAt(x) === query.charCodeAt(y)) {
        x++;
        y++;
      }
      current[offset + diagonal] = x;
      if (x >= reference.length && y >= query.length) return depth;
    }
    previous = current;
  }
  return maximum + 1;
}

/**
 * Canonicalizes circular origin and, optionally, molecule orientation. Sequence
 * text is the primary key; annotation geometry provides a deterministic tie-break.
 */
export function canonicalizeBiologicalSequence(
  input: BiologicalSequenceInput,
  allowReverseComplement = true,
): CanonicalSequence {
  const normalized = normalizeSequence(input.sequence);
  if (normalized.length === 0) {
    return { ...input, sequence: '', length: 0, orientation: 'forward', rotation0: 0, features: [] };
  }
  const candidates = [makeCandidate(input, normalized, 'forward')];
  if (allowReverseComplement) candidates.push(makeCandidate(input, normalized, 'reverse-complement'));
  candidates.sort((left, right) => (
    left.sequence.localeCompare(right.sequence)
    || left.signature.localeCompare(right.signature)
    || left.orientation.localeCompare(right.orientation)
    || left.rotation0 - right.rotation0
  ));
  const winner = candidates[0];
  return {
    id: input.id,
    name: input.name,
    topology: input.topology,
    sequence: winner.sequence,
    length: winner.sequence.length,
    orientation: winner.orientation,
    rotation0: winner.rotation0,
    features: winner.features,
  };
}

/**
 * Places a circular query onto an already-canonical reference. Unique k-mer
 * votes make small indels insensitive to the arbitrary input origin while the
 * deterministic tie-breaks keep snapshots and exports stable.
 */
export function canonicalizeCircularQueryAgainstReference(
  input: BiologicalSequenceInput,
  reference: CanonicalSequence,
  allowReverseComplement = true,
): CanonicalSequence {
  if (input.topology !== 'circular' || reference.topology !== 'circular') return canonicalizeBiologicalSequence(input, allowReverseComplement);
  const normalized = normalizeSequence(input.sequence);
  if (normalized.length === 0) return canonicalizeBiologicalSequence(input, allowReverseComplement);
  const orientations: DiffOrientation[] = allowReverseComplement ? ['forward', 'reverse-complement'] : ['forward'];
  const scored: Array<{ candidate: Candidate; votes: number; editDistance: number; positionalMatches: number }> = [];
  for (const orientation of orientations) {
    const oriented = orientation === 'forward' ? normalized : reverseComplementIupac(normalized);
    const rotations = candidateRotations(reference.sequence, oriented);
    const fallbackRotation = leastRotationIndex(oriented);
    if (!rotations.has(fallbackRotation)) rotations.set(fallbackRotation, 0);
    const topRotations = [...rotations.entries()]
      .sort((left, right) => right[1] - left[1] || left[0] - right[0])
      .slice(0, 8);
    for (const [rotation0, votes] of topRotations) {
      const candidate = makeCandidate(input, normalized, orientation, rotation0);
      scored.push({ candidate, votes, editDistance: boundedMyersDistance(reference.sequence, candidate.sequence, 64), positionalMatches: positionalMatchCount(reference.sequence, candidate.sequence) });
    }
  }
  scored.sort((left, right) => (
    left.editDistance - right.editDistance
    || right.votes - left.votes
    || right.positionalMatches - left.positionalMatches
    || left.candidate.sequence.localeCompare(right.candidate.sequence)
    || left.candidate.signature.localeCompare(right.candidate.signature)
    || left.candidate.orientation.localeCompare(right.candidate.orientation)
    || left.candidate.rotation0 - right.candidate.rotation0
  ));
  const winner = scored[0].candidate;
  return {
    id: input.id,
    name: input.name,
    topology: input.topology,
    sequence: winner.sequence,
    length: winner.sequence.length,
    orientation: winner.orientation,
    rotation0: winner.rotation0,
    features: winner.features,
  };
}

export function canonicalIntervalToOriginalSegments(
  start0: number,
  end0Exclusive: number,
  canonical: Pick<CanonicalSequence, 'length' | 'topology' | 'orientation' | 'rotation0'>,
): SequenceInterval[] {
  const length = canonical.length;
  if (length === 0) return [];
  if (start0 === end0Exclusive) {
    const orientedPoint = canonical.topology === 'circular' ? (start0 + canonical.rotation0) % length : start0;
    const point = canonical.orientation === 'forward' ? orientedPoint : length - orientedPoint;
    return [{ start0: point, end0Exclusive: point }];
  }
  const canonicalSegments = canonical.topology === 'circular' && end0Exclusive > length
    ? [{ start0, end0Exclusive: length }, { start0: 0, end0Exclusive: end0Exclusive - length }]
    : [{ start0, end0Exclusive }];
  const orientedSegments = canonical.topology === 'circular'
    ? canonicalSegments.flatMap(segment => rotateInterval(segment, -canonical.rotation0, length))
    : canonicalSegments;
  const original = orientedSegments.map(segment => canonical.orientation === 'forward'
    ? segment
    : { start0: length - segment.end0Exclusive, end0Exclusive: length - segment.start0 });
  return mergeSegments(original);
}
