import type { Feature } from '../../domain/feature';

export type TerminalType = 'none' | 'clockwise-arrow' | 'counterclockwise-arrow';

export function getSegmentTerminal(
  feature: Feature,
  segmentIndex: number,
  sequenceLength: number
): TerminalType {
  const segments = feature.segments;
  if (segments.length === 0) return 'none';

  if (segments.length === 1) {
    if (segmentIndex === 0) {
      return feature.strand === 1 ? 'clockwise-arrow' : 'counterclockwise-arrow';
    }
    return 'none';
  }

  // Sort segments by start0 ascending, keeping track of original indices
  const indexedSegments = segments.map((seg, i) => ({ seg, originalIndex: i }));
  indexedSegments.sort((a, b) => a.seg.start0 - b.seg.start0);

  // Find the largest gap to determine the true physical start/end
  let maxGap = -1;
  let maxGapIndex = -1;

  for (let i = 0; i < indexedSegments.length; i++) {
    const current = indexedSegments[i].seg;
    const next = indexedSegments[(i + 1) % indexedSegments.length].seg;

    let gap;
    if (i === indexedSegments.length - 1) {
      // Wrap-around gap
      gap = (sequenceLength - current.end0Exclusive) + next.start0;
    } else {
      gap = next.start0 - current.end0Exclusive;
    }

    if (gap > maxGap) {
      maxGap = gap;
      maxGapIndex = i;
    }
  }

  // The segment AFTER the max gap is the physical start
  const physicalStartIndex = (maxGapIndex + 1) % indexedSegments.length;
  // The segment BEFORE the max gap (which is maxGapIndex) is the physical end
  const physicalEndIndex = maxGapIndex;

  const physicalStartOriginalIndex = indexedSegments[physicalStartIndex].originalIndex;
  const physicalEndOriginalIndex = indexedSegments[physicalEndIndex].originalIndex;

  if (feature.strand === 1) {
    return segmentIndex === physicalEndOriginalIndex ? 'clockwise-arrow' : 'none';
  } else {
    return segmentIndex === physicalStartOriginalIndex ? 'counterclockwise-arrow' : 'none';
  }
}
