export const FEATURE_TYPES = [
  'CDS',
  'gene',
  'exon',
  'intron',
  'signal_peptide',
  'transit_peptide',
  'cleavage_site',
  'promoter',
  'terminator',
  'polyA_signal',
  "5'UTR",
  "3'UTR",
  'RBS',
  'regulatory',
  'enhancer',
  'operator',
  'ncRNA',
  'lncRNA',
  'tRNA',
  'rRNA',
  'snRNA',
  'snoRNA',
  'origin',
  'repeat_region',
  'LTR',
  'transposon',
  'engineered_region',
  'misc_structure',
  'protein_bind',
  'primer_bind',
  'misc_binding',
  'misc_difference',
  'resistance marker',
  'tag',
  'reporter',
  'crispr_target',
  'recombination_site',
  'att_site',
  'loxP_site',
  'frt_site',
  'source',
  'misc_feature'
] as const;

export type FeatureType = typeof FEATURE_TYPES[number];

export const FEATURE_SOURCES = [
  'imported',
  'manual',
  'detected',
  'agent',
  'benchling',
  'snapgene',
  'genbank',
  'ensembl',
  'uniprot',
  'community',
  'prediction'
] as const;
export type FeatureSource = typeof FEATURE_SOURCES[number];

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
  source: FeatureSource;
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
