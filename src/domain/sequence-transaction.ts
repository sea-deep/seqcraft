import type { SequenceEditAction } from '../scientific/sequence-editing';

export interface CdsTranslationVerification {
  featureId: string;
  featureName: string;
  strand: 1 | -1;
  codonBefore: string;
  codonAfter: string;
  aminoAcidBefore: string;
  aminoAcidAfter: string;
  isSynonymous: boolean;
  fullTranslationBefore: string;
  fullTranslationAfter: string;
}

export interface EnzymeSiteVerification {
  enzymeName: string;
  countBefore: number;
  countAfter: number;
  abolished: boolean;
}

export interface TransactionInvariantReport {
  passed: boolean;
  position1: number;
  originalBase: string;
  mutatedBase: string;
  changedNucleotideCount: number;
  lengthBefore: number;
  lengthAfter: number;
  lengthDelta: number;
  coordinatesStable: boolean;
  affectedFeatureNames: string[];
  cdsVerification?: CdsTranslationVerification;
  enzymeVerification?: EnzymeSiteVerification;
  summary: string;
}

export interface SequenceTransaction {
  id: string;
  documentId: string;
  baseRevision: number;
  baseSequenceHash: string;
  operation: SequenceEditAction;
  affectedRange: { start0: number; end0Exclusive: number };
  beforeFragment: string;
  afterFragment: string;
  invariantReport: TransactionInvariantReport;
  expectedSequenceHash: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'stale';
  createdAt: number;
}
