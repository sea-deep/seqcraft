export const LINEAR_MAP_START_X = 72;
export const LINEAR_MAP_END_X = 928;

export function coordinateToLinearX(
  coordinate: number,
  sequenceLength: number,
  startX = LINEAR_MAP_START_X,
  endX = LINEAR_MAP_END_X,
): number {
  if (sequenceLength <= 0) return startX;
  const clamped = Math.min(sequenceLength, Math.max(0, coordinate));
  return startX + (clamped / sequenceLength) * (endX - startX);
}

export function linearXToCoordinate(
  x: number,
  sequenceLength: number,
  startX = LINEAR_MAP_START_X,
  endX = LINEAR_MAP_END_X,
): number {
  if (sequenceLength <= 1 || endX <= startX) return 0;
  const fraction = Math.min(1, Math.max(0, (x - startX) / (endX - startX)));
  return Math.min(sequenceLength - 1, Math.floor(fraction * sequenceLength));
}
