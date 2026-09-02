import type { Feature, SequenceInterval } from './feature';
import type { Topology } from './document';

export type DiffOrientation = 'forward' | 'reverse-complement';
export type BaseDifferenceKind = 'substitution' | 'insertion' | 'deletion';
export type FeatureDifferenceKind = 'added' | 'removed' | 'modified' | 'unchanged';
export type ProteinConsequenceKind =
  | 'synonymous'
  | 'missense'
  | 'nonsense'
  | 'stop_lost'
  | 'start_lost'
  | 'frameshift'
  | 'inframe_insertion'
  | 'inframe_deletion'
  | 'coding_sequence_change';

export interface BiologicalSequenceInput {
  id: string;
  name: string;
  sequence: string;
  topology: Topology;
  features: Feature[];
}

export interface CanonicalFeature extends Feature {
  originalId: string;
}

export interface CanonicalSequence {
  id: string;
  name: string;
  topology: Topology;
  sequence: string;
  length: number;
  orientation: DiffOrientation;
  /** Index in the oriented input that renders at canonical coordinate zero. */
  rotation0: number;
  features: CanonicalFeature[];
}

export interface BaseDifference {
  id: string;
  kind: BaseDifferenceKind;
  alignmentStart: number;
  alignmentEndExclusive: number;
  referenceStart0: number;
  referenceEnd0Exclusive: number;
  queryStart0: number;
  queryEnd0Exclusive: number;
  referenceBases: string;
  queryBases: string;
  referenceOriginalSegments: SequenceInterval[];
  queryOriginalSegments: SequenceInterval[];
  affectedReferenceFeatureIds: string[];
  affectedQueryFeatureIds: string[];
}

export interface FeatureDifference {
  id: string;
  kind: FeatureDifferenceKind;
  referenceFeature: CanonicalFeature | null;
  queryFeature: CanonicalFeature | null;
  changes: Array<'name' | 'type' | 'coordinates' | 'strand' | 'qualifiers'>;
}

export interface ProteinConsequence {
  id: string;
  referenceFeatureId: string;
  queryFeatureId: string | null;
  featureName: string;
  kinds: ProteinConsequenceKind[];
  geneticCodeTable: 1 | 2 | 11;
  referenceCodingLengthBp: number;
  queryCodingLengthBp: number | null;
  referenceProtein: string;
  queryProtein: string | null;
  firstAffectedAminoAcid1: number | null;
  referenceAminoAcids: string;
  queryAminoAcids: string;
  affectedDifferenceIds: string[];
}

export interface SequenceDiffOptions {
  maxEditDistance?: number;
  includeUnchangedFeatures?: boolean;
  allowReverseComplement?: boolean;
}

export interface SequenceDiffResult {
  schemaVersion: 1;
  id: string;
  coordinateSystem: '0-based-half-open-canonical';
  reference: CanonicalSequence;
  query: CanonicalSequence;
  alignedReference: string;
  alignedQuery: string;
  differences: BaseDifference[];
  featureDifferences: FeatureDifference[];
  proteinConsequences: ProteinConsequence[];
  matches: number;
  identityPercent: number;
  editDistance: number;
  exact: boolean;
  canonicalization: {
    circularOriginInvariant: boolean;
    reverseComplementInvariant: boolean;
  };
}
