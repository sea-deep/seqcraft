import type { Primer, PrimerBinding } from '../domain/primer';
import { findIupacMatchStarts, reverseComplementIupac } from './restriction-analysis';
import type { SequenceInterval } from '../domain/feature';

export function analyzePrimerBindings(
  sequence: string,
  topology: 'linear' | 'circular',
  primer: Primer
): PrimerBinding[] {
  const seqLen = sequence.length;
  if (seqLen === 0) return [];

  const primerLen = primer.sequence.length;
  const fwdSeq = primer.sequence.toUpperCase();
  const revSeq = reverseComplementIupac(fwdSeq);
  const isPalindromic = fwdSeq === revSeq;

  let searchSeq = sequence;
  if (topology === 'circular' && seqLen >= primerLen) {
    searchSeq += sequence.slice(0, primerLen - 1);
  }

  const hits: PrimerBinding[] = [];

  const findMatches = (pattern: string, orientation: 'forward' | 'reverse', extensionDir: 1 | -1) => {
    for (const matchStart of findIupacMatchStarts(searchSeq, pattern, seqLen)) {
      const matchEnd = matchStart + primerLen;
      const start0 = matchStart;
      const end0Exclusive = matchEnd <= seqLen ? matchEnd : matchEnd % seqLen;

      let segments: SequenceInterval[];
      let wrapsOrigin = false;

      if (matchEnd <= seqLen) {
        segments = [{ start0, end0Exclusive }];
      } else {
        segments = [
          { start0, end0Exclusive: seqLen },
          { start0: 0, end0Exclusive }
        ];
        wrapsOrigin = true;
      }

      let threePrimeBase0: number;
      let fivePrimeBase0: number;

      if (orientation === 'forward') {
        fivePrimeBase0 = start0;
        threePrimeBase0 = (matchEnd - 1) % seqLen;
      } else {
        fivePrimeBase0 = (matchEnd - 1) % seqLen;
        threePrimeBase0 = start0;
      }

      let matchedRef = '';
      for (let i = 0; i < primerLen; i++) {
        matchedRef += sequence[(matchStart + i) % seqLen];
      }

      hits.push({
        primerId: primer.id,
        start0,
        end0Exclusive,
        segments,
        orientation,
        extensionDirection: extensionDir,
        threePrimeBase0,
        fivePrimeBase0,
        wrapsOrigin,
        matchedReferenceSequence: matchedRef,
      });
    }
  };

  findMatches(fwdSeq, 'forward', 1);
  if (!isPalindromic) {
    findMatches(revSeq, 'reverse', -1);
  } else {
    // If palindromic, the same physical sequence supports both forward and reverse binding
    // It's the exact same match start/end, but opposite orientation
    findMatches(fwdSeq, 'reverse', -1);
  }

  // Deterministic sort: start0 -> orientation -> primerId
  hits.sort((a, b) => {
    if (a.start0 !== b.start0) return a.start0 - b.start0;
    if (a.orientation !== b.orientation) return a.orientation.localeCompare(b.orientation);
    return a.primerId.localeCompare(b.primerId);
  });

  return hits;
}

export function getPrimerThreePrimeCoordinate(binding: PrimerBinding): number {
  return binding.threePrimeBase0;
}

export function getPrimerExtensionDirection(binding: PrimerBinding): 1 | -1 {
  return binding.extensionDirection;
}

export function circularDistanceInDirection(
  startCoord: number,
  endCoord: number,
  direction: 1 | -1,
  sequenceLength: number
): number {
  if (direction === 1) {
    if (endCoord >= startCoord) return endCoord - startCoord;
    return (sequenceLength - startCoord) + endCoord;
  } else {
    if (startCoord >= endCoord) return startCoord - endCoord;
    return startCoord + (sequenceLength - endCoord);
  }
}

// Classification helpers
export function isUniqueBinder(bindings: PrimerBinding[]): boolean {
  return bindings.length === 1;
}

export function isMultipleBinder(bindings: PrimerBinding[]): boolean {
  return bindings.length > 1;
}

export function isNonBinder(bindings: PrimerBinding[]): boolean {
  return bindings.length === 0;
}

export function getForwardBindingsOnly(bindings: PrimerBinding[]): PrimerBinding[] {
  return bindings.filter(b => b.orientation === 'forward');
}

export function getReverseBindingsOnly(bindings: PrimerBinding[]): PrimerBinding[] {
  return bindings.filter(b => b.orientation === 'reverse');
}
