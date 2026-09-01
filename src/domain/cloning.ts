import type { Feature } from './feature';
import type { DigestEnd } from './digest';

export type CloningOrientation = 'forward' | 'reverse';

export interface CloningJunction {
  leftEnd: DigestEnd;
  rightEnd: DigestEnd;
  isCompatible: boolean;
  compatibilityMode: 'sticky' | 'blunt' | 'incompatible' | 'ambiguous';
}

export interface RestrictionCloneCandidate {
  id: string;
  orientation: CloningOrientation;
  junction1: CloningJunction;
  junction2: CloningJunction;
  isValid: boolean;
  recombinantLengthBp: number;
  recombinantSequence: string;
  recombinantFeatures: Feature[];
  warnings: string[];
}

export interface RestrictionCloneProposal {
  proposalId: string;
  
  vectorDocumentId: string;
  vectorDocumentName: string;
  
  insertDocumentId: string;
  insertDocumentName: string;
  
  enzymeIds: string[];
  enzymeNames: string[];
  
  vectorFragmentId: string;
  vectorBackboneLengthBp: number;
  
  insertFragmentId: string;
  insertLengthBp: number;

  candidates: RestrictionCloneCandidate[];
  warnings: string[];
  
  sourceMetadata: {
    vectorFeaturesOmitted: number;
    insertFeaturesOmitted: number;
  };
}
