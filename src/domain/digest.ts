import type { SequenceInterval } from './feature';
import type { RestrictionSite, EndType } from '../scientific/restriction-analysis';

export interface DigestCut {
  coordinate0: number; // forwardCut0
  sites: RestrictionSite[]; 
}

export type DigestEndType = EndType | 'natural' | 'circular';

export interface DigestEnd {
  type: DigestEndType;
  fragmentSide: 'left' | 'right';
  protrudingStrand: 'forward' | 'reverse' | 'none';
  sequence: string; 
  overhangLength: number; 
  sites: RestrictionSite[]; 
  isAmbiguousChemistry?: boolean; 
}

export interface DigestFragment {
  id: string;
  lengthBp: number;
  segments: SequenceInterval[];
  leftEnd: DigestEnd;
  rightEnd: DigestEnd;
  isCircular: boolean;
}

export interface DigestResult {
  sequenceLength: number;
  topology: 'linear' | 'circular';
  selectedEnzymeIds: string[];
  cuts: DigestCut[];
  fragments: DigestFragment[];
}
