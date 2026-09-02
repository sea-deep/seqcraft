export type DifferenceKind = 'substitution' | 'insertion' | 'deletion';

export interface AlignmentDifference {
  kind: DifferenceKind;
  alignmentStart: number;
  alignmentEndExclusive: number;
  referenceStart0: number;
  referenceEnd0Exclusive: number;
  queryStart0: number;
  queryEnd0Exclusive: number;
}

export interface SequenceComparisonResult {
  alignedReference: string;
  alignedQuery: string;
  differences: AlignmentDifference[];
  matches: number;
  identityPercent: number;
  exact: boolean;
}

function fallbackAlignment(reference: string, query: string): [string, string] {
  const width = Math.max(reference.length, query.length);
  return [reference.padEnd(width, '-'), query.padEnd(width, '-')];
}

export function alignSequences(referenceInput: string, queryInput: string, maxCells = 12_000_000): SequenceComparisonResult {
  const reference = referenceInput.toUpperCase();
  const query = queryInput.toUpperCase();
  const rows = reference.length + 1;
  const columns = query.length + 1;
  let alignedReference: string;
  let alignedQuery: string;
  let exact = true;

  if (rows * columns > maxCells) {
    [alignedReference, alignedQuery] = fallbackAlignment(reference, query);
    exact = false;
  } else {
    const directions = new Uint8Array(rows * columns);
    let previous = new Int32Array(columns);
    let current = new Int32Array(columns);
    for (let column = 1; column < columns; column++) {
      previous[column] = -2 * column;
      directions[column] = 2;
    }
    for (let row = 1; row < rows; row++) {
      current[0] = -2 * row;
      directions[row * columns] = 1;
      for (let column = 1; column < columns; column++) {
        const diagonal = previous[column - 1] + (reference[row - 1] === query[column - 1] ? 2 : -1);
        const up = previous[column] - 2;
        const left = current[column - 1] - 2;
        if (diagonal >= up && diagonal >= left) {
          current[column] = diagonal;
          directions[row * columns + column] = 0;
        } else if (up >= left) {
          current[column] = up;
          directions[row * columns + column] = 1;
        } else {
          current[column] = left;
          directions[row * columns + column] = 2;
        }
      }
      [previous, current] = [current, previous];
    }

    let row = reference.length;
    let column = query.length;
    const referenceOutput: string[] = [];
    const queryOutput: string[] = [];
    while (row > 0 || column > 0) {
      const direction = directions[row * columns + column];
      if (row > 0 && column > 0 && direction === 0) {
        referenceOutput.push(reference[--row]);
        queryOutput.push(query[--column]);
      } else if (row > 0 && (column === 0 || direction === 1)) {
        referenceOutput.push(reference[--row]);
        queryOutput.push('-');
      } else {
        referenceOutput.push('-');
        queryOutput.push(query[--column]);
      }
    }
    alignedReference = referenceOutput.reverse().join('');
    alignedQuery = queryOutput.reverse().join('');
  }

  const differences: AlignmentDifference[] = [];
  let matches = 0;
  let referencePosition = 0;
  let queryPosition = 0;
  let active: AlignmentDifference | null = null;
  for (let index = 0; index < alignedReference.length; index++) {
    const referenceBase = alignedReference[index];
    const queryBase = alignedQuery[index];
    if (referenceBase === queryBase) {
      matches++;
      if (active) { differences.push(active); active = null; }
    } else {
      const kind: DifferenceKind = referenceBase === '-' ? 'insertion' : queryBase === '-' ? 'deletion' : 'substitution';
      if (!active || active.kind !== kind || active.alignmentEndExclusive !== index) {
        if (active) differences.push(active);
        active = { kind, alignmentStart: index, alignmentEndExclusive: index + 1, referenceStart0: referencePosition, referenceEnd0Exclusive: referencePosition + (referenceBase === '-' ? 0 : 1), queryStart0: queryPosition, queryEnd0Exclusive: queryPosition + (queryBase === '-' ? 0 : 1) };
      } else {
        active.alignmentEndExclusive = index + 1;
        if (referenceBase !== '-') active.referenceEnd0Exclusive++;
        if (queryBase !== '-') active.queryEnd0Exclusive++;
      }
    }
    if (referenceBase !== '-') referencePosition++;
    if (queryBase !== '-') queryPosition++;
  }
  if (active) differences.push(active);
  const denominator = Math.max(alignedReference.length, 1);
  return { alignedReference, alignedQuery, differences, matches, identityPercent: (matches / denominator) * 100, exact };
}
