export type FeatureType =
  | "CDS"
  | "gene"
  | "promoter"
  | "terminator"
  | "origin"
  | "resistance marker"
  | "tag"
  | "misc_feature"
  | "source";

export interface SequenceInterval {
  start0: number;
  end0Exclusive: number;
}

export interface Feature {
  id: string;
  name: string;
  type: FeatureType;
  strand: 1 | -1;
  segments: SequenceInterval[];
  qualifiers: Record<string, string | string[]>;
  source: "imported" | "manual" | "detected" | "agent";
}

export function validateInterval(interval: SequenceInterval, sequenceLength: number): void {
  if (interval.start0 < 0) throw new Error("Interval start0 cannot be negative");
  if (interval.end0Exclusive < 0) throw new Error("Interval end0Exclusive cannot be negative");
  if (interval.end0Exclusive < interval.start0) throw new Error("Interval end0Exclusive must be >= start0");
  if (interval.end0Exclusive > sequenceLength) throw new Error("Interval end0Exclusive exceeds sequence length");
}

export function getFeatureLength(feature: Feature): number {
  return feature.segments.reduce((acc, seg) => acc + (seg.end0Exclusive - seg.start0), 0);
}
