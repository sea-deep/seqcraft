import type { SequenceInterval } from './feature';
import type { PrimerBinding } from './primer';

export interface PCRProduct {
  id: string;
  forwardPrimerId: string; // The ID of the primer that binds in +1 direction
  reversePrimerId: string; // The ID of the primer that binds in -1 direction
  forwardBinding: PrimerBinding;
  reverseBinding: PrimerBinding;
  segments: SequenceInterval[];
  lengthBp: number;
  sequence: string;
  wrapsOrigin: boolean;
}

export interface PCRResult {
  sequenceLength: number;
  topology: 'linear' | 'circular';
  forwardPrimerBindings: PrimerBinding[];
  reversePrimerBindings: PrimerBinding[];
  products: PCRProduct[];
}
