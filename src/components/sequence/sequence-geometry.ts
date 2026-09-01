export const BASES_PER_LINE = 60;
export const GROUP_SIZE = 10;
export const CHAR_WIDTH = 8.5; // We will use a deterministic approach.
// For monospace fonts, if we use a fixed pixel character width, it's deterministic.
// Actually, using `em` or `ch` is even better for CSS.
// Let's use `ch` units: 1ch = width of '0' or monospace char.
// A group of 10 bases = 10ch. 
// A line of 60 bases = 6 groups of 10 bases, with gaps between them.
// Gap width: 1ch (or 1.5ch). Let's say gap is 1ch.
// Total bases = 60. Groups = 6. Gaps = 5.
// So a line is 60ch + 5ch = 65ch wide.

// Returns the x position in `ch` units for a given base index within a line (0 to 59).
export function baseX(indexWithinLine: number): number {
  const groupIndex = Math.floor(indexWithinLine / GROUP_SIZE);
  const offsetWithinGroup = indexWithinLine % GROUP_SIZE;
  // each group is GROUP_SIZE ch wide. Each gap is 1ch.
  const gapWidth = 1;
  return (groupIndex * GROUP_SIZE) + (groupIndex * gapWidth) + offsetWithinGroup;
}

// Returns the total width in `ch` of a segment within the line.
export function segmentWidth(startIdx: number, endIdxExclusive: number): number {
  if (endIdxExclusive <= startIdx) return 0;
  return baseX(endIdxExclusive - 1) - baseX(startIdx) + 1;
}

export const ROW_HEIGHT_BASES = 24;
export const TRACK_HEIGHT = 14;
export const TRACK_GAP = 2;
export const LINE_VERTICAL_PADDING = 16;

export function positionXToLineIndex(xPx: number, charWidthPx: number): number {
  const xCh = xPx / charWidthPx;
  
  // Total group width including gap = GROUP_SIZE + 1 = 11ch.
  const groupWidthCh = GROUP_SIZE + 1;
  const groupIndex = Math.floor(xCh / groupWidthCh);
  
  // Offset inside the group
  const offsetCh = xCh - (groupIndex * groupWidthCh);
  
  // If it's in the gap, just cap it to the last base of the group or first of next.
  // We'll just Math.floor it. If offsetCh >= 10, it's the gap, cap at 9.
  const indexInGroup = Math.min(Math.floor(offsetCh), GROUP_SIZE - 1);
  
  const index = groupIndex * GROUP_SIZE + indexInGroup;
  return Math.max(0, Math.min(BASES_PER_LINE - 1, index));
}
