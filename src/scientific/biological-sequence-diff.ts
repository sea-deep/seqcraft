import type {
  BaseDifference,
  BiologicalSequenceInput,
  CanonicalFeature,
  CanonicalSequence,
  SequenceDiffOptions,
  SequenceDiffResult,
} from '../domain/sequence-diff';
import { canonicalIntervalToOriginalSegments, canonicalizeBiologicalSequence, canonicalizeCircularQueryAgainstReference } from './canonical-sequence';
import { diffFeatures } from './feature-diff';
import { reportProteinConsequences } from './protein-consequences';

type EditOperation = { kind: 'equal' | 'delete' | 'insert'; value: string };

interface AlignmentOutput {
  alignedReference: string;
  alignedQuery: string;
  exact: boolean;
}

function reconstructMyers(trace: Int32Array[], reference: string, query: string, offset: number): EditOperation[] {
  let x = reference.length;
  let y = query.length;
  const reversed: EditOperation[] = [];
  for (let depth = trace.length - 1; depth > 0; depth--) {
    const previous = trace[depth - 1];
    const diagonal = x - y;
    const previousDiagonal = diagonal === -depth || (diagonal !== depth && previous[offset + diagonal - 1] < previous[offset + diagonal + 1])
      ? diagonal + 1
      : diagonal - 1;
    const previousX = previous[offset + previousDiagonal];
    const previousY = previousX - previousDiagonal;
    while (x > previousX && y > previousY) {
      reversed.push({ kind: 'equal', value: reference[x - 1] });
      x--;
      y--;
    }
    if (x === previousX) {
      reversed.push({ kind: 'insert', value: query[y - 1] });
      y--;
    } else {
      reversed.push({ kind: 'delete', value: reference[x - 1] });
      x--;
    }
  }
  while (x > 0 && y > 0) {
    reversed.push({ kind: 'equal', value: reference[x - 1] });
    x--;
    y--;
  }
  while (x > 0) reversed.push({ kind: 'delete', value: reference[--x] });
  while (y > 0) reversed.push({ kind: 'insert', value: query[--y] });
  return reversed.reverse();
}

function myersOperations(reference: string, query: string, maxEditDistance: number): EditOperation[] | null {
  if (reference === query) return [...reference].map(value => ({ kind: 'equal', value }));
  const limit = Math.min(reference.length + query.length, Math.max(0, maxEditDistance));
  const offset = limit + 1;
  let previous = new Int32Array(limit * 2 + 3);
  previous.fill(-1);
  previous[offset + 1] = 0;
  const trace: Int32Array[] = [];

  for (let depth = 0; depth <= limit; depth++) {
    const current = new Int32Array(limit * 2 + 3);
    current.fill(-1);
    for (let diagonal = -depth; diagonal <= depth; diagonal += 2) {
      let x = diagonal === -depth || (diagonal !== depth && previous[offset + diagonal - 1] < previous[offset + diagonal + 1])
        ? previous[offset + diagonal + 1]
        : previous[offset + diagonal - 1] + 1;
      let y = x - diagonal;
      while (x < reference.length && y < query.length && reference[x] === query[y]) {
        x++;
        y++;
      }
      current[offset + diagonal] = x;
      if (x >= reference.length && y >= query.length) {
        trace.push(current);
        return reconstructMyers(trace, reference, query, offset);
      }
    }
    trace.push(current);
    previous = current;
  }
  return null;
}

function positionalFallback(reference: string, query: string): AlignmentOutput {
  let prefix = 0;
  while (prefix < reference.length && prefix < query.length && reference[prefix] === query[prefix]) prefix++;
  let suffix = 0;
  while (suffix < reference.length - prefix && suffix < query.length - prefix && reference[reference.length - suffix - 1] === query[query.length - suffix - 1]) suffix++;
  const referenceMiddle = reference.slice(prefix, reference.length - suffix);
  const queryMiddle = query.slice(prefix, query.length - suffix);
  const common = Math.min(referenceMiddle.length, queryMiddle.length);
  const alignedReference = reference.slice(0, prefix)
    + referenceMiddle.slice(0, common)
    + referenceMiddle.slice(common)
    + '-'.repeat(Math.max(0, queryMiddle.length - common))
    + reference.slice(reference.length - suffix);
  const alignedQuery = query.slice(0, prefix)
    + queryMiddle.slice(0, common)
    + '-'.repeat(Math.max(0, referenceMiddle.length - common))
    + queryMiddle.slice(common)
    + query.slice(query.length - suffix);
  return { alignedReference, alignedQuery, exact: false };
}

function operationsToAlignment(operations: EditOperation[]): AlignmentOutput {
  const referenceOutput: string[] = [];
  const queryOutput: string[] = [];
  let index = 0;
  while (index < operations.length) {
    if (operations[index].kind === 'equal') {
      referenceOutput.push(operations[index].value);
      queryOutput.push(operations[index].value);
      index++;
      continue;
    }
    const deleted: string[] = [];
    const inserted: string[] = [];
    while (index < operations.length && operations[index].kind !== 'equal') {
      const operation = operations[index++];
      if (operation.kind === 'delete') deleted.push(operation.value);
      else inserted.push(operation.value);
    }
    const paired = Math.min(deleted.length, inserted.length);
    for (let pair = 0; pair < paired; pair++) {
      referenceOutput.push(deleted[pair]);
      queryOutput.push(inserted[pair]);
    }
    for (let deletion = paired; deletion < deleted.length; deletion++) {
      referenceOutput.push(deleted[deletion]);
      queryOutput.push('-');
    }
    for (let insertion = paired; insertion < inserted.length; insertion++) {
      referenceOutput.push('-');
      queryOutput.push(inserted[insertion]);
    }
  }
  return { alignedReference: referenceOutput.join(''), alignedQuery: queryOutput.join(''), exact: true };
}

function levenshteinAlign(reference: string, query: string): { reference: string; query: string } {
  const rows = reference.length + 1;
  const columns = query.length + 1;
  const directions = new Uint8Array(rows * columns);
  let previous = new Uint16Array(columns);
  let current = new Uint16Array(columns);
  for (let column = 1; column < columns; column++) {
    previous[column] = column;
    directions[column] = 2;
  }
  for (let row = 1; row < rows; row++) {
    current[0] = row;
    directions[row * columns] = 1;
    for (let column = 1; column < columns; column++) {
      const diagonal = previous[column - 1] + (reference[row - 1] === query[column - 1] ? 0 : 1);
      const deletion = previous[column] + 1;
      const insertion = current[column - 1] + 1;
      if (diagonal <= deletion && diagonal <= insertion) {
        current[column] = diagonal;
        directions[row * columns + column] = 0;
      } else if (deletion <= insertion) {
        current[column] = deletion;
        directions[row * columns + column] = 1;
      } else {
        current[column] = insertion;
        directions[row * columns + column] = 2;
      }
    }
    [previous, current] = [current, previous];
  }
  let row = reference.length;
  let column = query.length;
  const alignedReference: string[] = [];
  const alignedQuery: string[] = [];
  while (row > 0 || column > 0) {
    const direction = directions[row * columns + column];
    if (row > 0 && column > 0 && direction === 0) {
      alignedReference.push(reference[--row]);
      alignedQuery.push(query[--column]);
    } else if (row > 0 && (column === 0 || direction === 1)) {
      alignedReference.push(reference[--row]);
      alignedQuery.push('-');
    } else {
      alignedReference.push('-');
      alignedQuery.push(query[--column]);
    }
  }
  return { reference: alignedReference.reverse().join(''), query: alignedQuery.reverse().join('') };
}

/** Re-align nearby Myers edit runs so a biological mismatch is reported as a substitution, not an arbitrary delete/insert pair around a repeated base. */
function normalizeLocalEditRuns(output: AlignmentOutput): AlignmentOutput {
  const differenceIndices: number[] = [];
  for (let index = 0; index < output.alignedReference.length; index++) if (output.alignedReference[index] !== output.alignedQuery[index]) differenceIndices.push(index);
  if (differenceIndices.length < 2) return output;
  const groups: Array<{ start: number; end: number }> = [];
  for (const index of differenceIndices) {
    const previous = groups.at(-1);
    if (previous && index - previous.end <= 12) previous.end = index + 1;
    else groups.push({ start: index, end: index + 1 });
  }
  const referenceParts: string[] = [];
  const queryParts: string[] = [];
  let cursor = 0;
  for (const group of groups) {
    referenceParts.push(output.alignedReference.slice(cursor, group.start));
    queryParts.push(output.alignedQuery.slice(cursor, group.start));
    const reference = output.alignedReference.slice(group.start, group.end).replaceAll('-', '');
    const query = output.alignedQuery.slice(group.start, group.end).replaceAll('-', '');
    if (reference.length * query.length <= 65_536) {
      const normalized = levenshteinAlign(reference, query);
      referenceParts.push(normalized.reference);
      queryParts.push(normalized.query);
    } else {
      referenceParts.push(output.alignedReference.slice(group.start, group.end));
      queryParts.push(output.alignedQuery.slice(group.start, group.end));
    }
    cursor = group.end;
  }
  referenceParts.push(output.alignedReference.slice(cursor));
  queryParts.push(output.alignedQuery.slice(cursor));
  return { ...output, alignedReference: referenceParts.join(''), alignedQuery: queryParts.join('') };
}

function align(reference: string, query: string, maxEditDistance: number): AlignmentOutput {
  const operations = myersOperations(reference, query, maxEditDistance);
  return normalizeLocalEditRuns(operations ? operationsToAlignment(operations) : positionalFallback(reference, query));
}

function intersects(feature: CanonicalFeature, start0: number, end0Exclusive: number): boolean {
  return feature.segments.some(segment => end0Exclusive === start0
    ? segment.start0 <= start0 && start0 <= segment.end0Exclusive
    : Math.max(segment.start0, start0) < Math.min(segment.end0Exclusive, end0Exclusive));
}

function collectDifferences(alignedReference: string, alignedQuery: string, reference: CanonicalSequence, query: CanonicalSequence): { differences: BaseDifference[]; matches: number } {
  const differences: BaseDifference[] = [];
  let matches = 0;
  let referencePosition = 0;
  let queryPosition = 0;
  let index = 0;
  while (index < alignedReference.length) {
    if (alignedReference[index] === alignedQuery[index]) {
      matches++;
      if (alignedReference[index] !== '-') {
        referencePosition++;
        queryPosition++;
      }
      index++;
      continue;
    }
    const referenceBase = alignedReference[index];
    const queryBase = alignedQuery[index];
    const kind: BaseDifference['kind'] = referenceBase === '-' ? 'insertion' : queryBase === '-' ? 'deletion' : 'substitution';
    const alignmentStart = index;
    const referenceStart0 = referencePosition;
    const queryStart0 = queryPosition;
    let referenceBases = '';
    let queryBases = '';
    while (index < alignedReference.length) {
      const nextReference = alignedReference[index];
      const nextQuery = alignedQuery[index];
      const nextKind: BaseDifference['kind'] = nextReference === '-' ? 'insertion' : nextQuery === '-' ? 'deletion' : 'substitution';
      if (nextReference === nextQuery || nextKind !== kind) break;
      if (nextReference !== '-') {
        referenceBases += nextReference;
        referencePosition++;
      }
      if (nextQuery !== '-') {
        queryBases += nextQuery;
        queryPosition++;
      }
      index++;
    }
    const referenceEnd0Exclusive = referencePosition;
    const queryEnd0Exclusive = queryPosition;
    const id = `base:${kind}:${referenceStart0}:${referenceEnd0Exclusive}:${queryStart0}:${queryEnd0Exclusive}`;
    differences.push({
      id,
      kind,
      alignmentStart,
      alignmentEndExclusive: index,
      referenceStart0,
      referenceEnd0Exclusive,
      queryStart0,
      queryEnd0Exclusive,
      referenceBases,
      queryBases,
      referenceOriginalSegments: canonicalIntervalToOriginalSegments(referenceStart0, referenceEnd0Exclusive, reference),
      queryOriginalSegments: canonicalIntervalToOriginalSegments(queryStart0, queryEnd0Exclusive, query),
      affectedReferenceFeatureIds: reference.features.filter(feature => intersects(feature, referenceStart0, referenceEnd0Exclusive)).map(feature => feature.id).sort(),
      affectedQueryFeatureIds: query.features.filter(feature => intersects(feature, queryStart0, queryEnd0Exclusive)).map(feature => feature.id).sort(),
    });
  }
  return { differences, matches };
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function diffBiologicalSequences(
  referenceInput: BiologicalSequenceInput,
  queryInput: BiologicalSequenceInput,
  options: SequenceDiffOptions = {},
): SequenceDiffResult {
  const allowReverseComplement = options.allowReverseComplement ?? (referenceInput.topology === 'circular' && queryInput.topology === 'circular');
  const reference = canonicalizeBiologicalSequence(referenceInput, allowReverseComplement);
  const query = referenceInput.topology === 'circular' && queryInput.topology === 'circular'
    ? canonicalizeCircularQueryAgainstReference(queryInput, reference, allowReverseComplement)
    : canonicalizeBiologicalSequence(queryInput, allowReverseComplement);
  const alignment = align(reference.sequence, query.sequence, options.maxEditDistance ?? 4_096);
  const { differences, matches } = collectDifferences(alignment.alignedReference, alignment.alignedQuery, reference, query);
  const allFeatureDifferences = diffFeatures(reference.features, query.features, true, { sequenceLength: reference.length, topology: reference.topology });
  const featureDifferences = options.includeUnchangedFeatures ? allFeatureDifferences : allFeatureDifferences.filter(difference => difference.kind !== 'unchanged');
  const proteinConsequences = reportProteinConsequences(reference, query, differences, allFeatureDifferences);
  const editDistance = differences.reduce((total, difference) => total + Math.max(difference.referenceBases.length, difference.queryBases.length), 0);
  const denominator = Math.max(alignment.alignedReference.length, 1);
  const hashInput = `${reference.sequence}\u0000${query.sequence}\u0000${differences.map(item => item.id).join('|')}\u0000${featureDifferences.map(item => item.id).join('|')}`;
  return {
    schemaVersion: 1,
    id: `seqdiff-${stableHash(hashInput)}`,
    coordinateSystem: '0-based-half-open-canonical',
    reference,
    query,
    alignedReference: alignment.alignedReference,
    alignedQuery: alignment.alignedQuery,
    differences,
    featureDifferences,
    proteinConsequences,
    matches,
    identityPercent: (matches / denominator) * 100,
    editDistance,
    exact: alignment.exact,
    canonicalization: {
      circularOriginInvariant: referenceInput.topology === 'circular' && queryInput.topology === 'circular',
      reverseComplementInvariant: allowReverseComplement,
    },
    representation: {
      referenceTopology: referenceInput.topology,
      queryTopology: queryInput.topology,
      topologyChanged: referenceInput.topology !== queryInput.topology,
      originChanged: referenceInput.topology === 'circular' && queryInput.topology === 'circular' && reference.rotation0 !== query.rotation0,
      orientationChanged: reference.orientation !== query.orientation,
      moleculeIdentityUnchanged: differences.length === 0,
    },
  };
}
