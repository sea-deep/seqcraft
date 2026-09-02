import type { Primer, PrimerBinding } from '../../domain/primer';

export interface PlacedPrimerBinding {
  primer: Primer;
  binding: PrimerBinding;
  lineStart: number;
  lineEndExclusive: number;
  lane: number;
}

export function placePrimerBindingsOnLine(primers: Primer[], bindings: PrimerBinding[], lineStart0: number, lineEnd0Exclusive: number): PlacedPrimerBinding[] {
  const primerById = new Map(primers.map(primer => [primer.id, primer]));
  const placed: PlacedPrimerBinding[] = [];
  const laneEnds: number[] = [];
  for (const binding of bindings) {
    const primer = primerById.get(binding.primerId);
    if (!primer) continue;
    for (const segment of binding.segments) {
      const start0 = Math.max(lineStart0, segment.start0);
      const end0Exclusive = Math.min(lineEnd0Exclusive, segment.end0Exclusive);
      if (start0 >= end0Exclusive) continue;
      const lineStart = start0 - lineStart0;
      const lineEndExclusive = end0Exclusive - lineStart0;
      let lane = 0;
      while (laneEnds[lane] !== undefined && laneEnds[lane] > lineStart) lane++;
      laneEnds[lane] = lineEndExclusive;
      placed.push({ primer, binding, lineStart, lineEndExclusive, lane });
    }
  }
  return placed;
}
