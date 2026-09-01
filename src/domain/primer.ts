import type { SequenceInterval } from './feature';

export interface Primer {
  id: string;
  name: string;
  sequence: string; // uppercase 5' -> 3'
  description?: string;
}

export interface PrimerBinding {
  primerId: string;
  start0: number; // 0-based coordinate of the 5' end of the match on reference
  end0Exclusive: number; // 0-based coordinate of the 3' end + 1
  segments: SequenceInterval[];
  orientation: 'forward' | 'reverse';
  extensionDirection: 1 | -1;
  threePrimeBase0: number; // exact coordinate of the primer's 3' end on reference
  fivePrimeBase0: number; // exact coordinate of the primer's 5' end on reference
  wrapsOrigin: boolean;
  matchedReferenceSequence: string; // The exact sequence found in the reference
}
