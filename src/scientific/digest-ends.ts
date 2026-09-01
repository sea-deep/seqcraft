import { getEndType } from './restriction-analysis';
import type { DigestEnd, DigestCut } from '../domain/digest';
import { BUILTIN_ENZYMES } from '../data/restriction-enzymes';
import { reverseComplementIupac } from './restriction-analysis';

export interface CutEnds {
  leftFragmentEnd: DigestEnd; // This is the right end of the left fragment
  rightFragmentEnd: DigestEnd; // This is the left end of the right fragment
}

export function deriveRestrictionCutEnds(
  sequence: string,
  topology: 'linear' | 'circular',
  cut: DigestCut
): CutEnds {
  const sequenceLength = sequence.length;
  const sites = cut.sites;
  const forwardCut0 = cut.coordinate0;

  // Check for ambiguous chemistry
  const primarySite = sites[0];
  const primaryReverseCut0 = primarySite.reverseCut0;
  
  let isAmbiguous = false;
  for (const site of sites) {
    if (site.reverseCut0 !== primaryReverseCut0) {
      isAmbiguous = true;
      break;
    }
  }

  const enzyme = BUILTIN_ENZYMES.find(e => e.id === primarySite.enzymeId)!;
  const endType = getEndType(enzyme);

  let dist = primaryReverseCut0 - forwardCut0;
  if (topology === 'circular') {
    if (dist > sequenceLength / 2) dist -= sequenceLength;
    if (dist < -sequenceLength / 2) dist += sequenceLength;
  }

  let overhangSequence = '';
  if (dist !== 0 && !isAmbiguous) {
    const absDist = Math.abs(dist);
    let minCoord = forwardCut0;
    if (dist < 0) {
      minCoord = primaryReverseCut0;
    }
    for (let i = 0; i < absDist; i++) {
      overhangSequence += sequence[(minCoord + i + sequenceLength) % sequenceLength];
    }
  }

  // Determine orientations based on end type
  let leftFragProtruding: 'forward' | 'reverse' | 'none' = 'none';
  let rightFragProtruding: 'forward' | 'reverse' | 'none' = 'none';
  let leftFragSeq = '';
  let rightFragSeq = '';

  if (!isAmbiguous && endType !== 'blunt') {
    if (endType === '5\' overhang') {
      // 5' overhang means reverse strand protrudes on the left fragment, forward strand protrudes on the right fragment
      leftFragProtruding = 'reverse';
      rightFragProtruding = 'forward';
      // The extracted `overhangSequence` is the forward strand sequence between minCoord and maxCoord.
      // For a 5' overhang, forwardCut0 < reverseCut0 (logically, i.e. dist > 0).
      // Left fragment's reverse strand protrusion is the reverse complement of the forward strand gap!
      leftFragSeq = reverseComplementIupac(overhangSequence);
      // Right fragment's forward strand protrusion is exactly the forward strand gap!
      rightFragSeq = overhangSequence;
    } else if (endType === '3\' overhang') {
      // 3' overhang means forward strand protrudes on the left fragment, reverse strand protrudes on the right fragment
      leftFragProtruding = 'forward';
      rightFragProtruding = 'reverse';
      // For a 3' overhang, forwardCut0 > reverseCut0 (logically, i.e. dist < 0).
      // Left fragment's forward strand protrusion is exactly the forward strand gap.
      leftFragSeq = overhangSequence;
      // Right fragment's reverse strand protrusion is the reverse complement.
      rightFragSeq = reverseComplementIupac(overhangSequence);
    }
  }

  return {
    leftFragmentEnd: {
      type: endType,
      fragmentSide: 'right',
      protrudingStrand: leftFragProtruding,
      sequence: leftFragSeq,
      overhangLength: leftFragSeq.length,
      sites,
      isAmbiguousChemistry: isAmbiguous
    },
    rightFragmentEnd: {
      type: endType,
      fragmentSide: 'left',
      protrudingStrand: rightFragProtruding,
      sequence: rightFragSeq,
      overhangLength: rightFragSeq.length,
      sites,
      isAmbiguousChemistry: isAmbiguous
    }
  };
}

export function createNaturalEnd(side: 'left' | 'right', topology: 'linear' | 'circular'): DigestEnd {
  return {
    type: topology === 'circular' ? 'circular' : 'natural',
    fragmentSide: side,
    protrudingStrand: 'none',
    sequence: '',
    overhangLength: 0,
    sites: []
  };
}
