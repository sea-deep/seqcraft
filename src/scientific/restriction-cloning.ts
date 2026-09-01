import type { SequenceDocument } from '../domain/document';
import type { RestrictionEnzyme } from '../domain/restriction';
import type { DigestFragment } from '../domain/digest';
import type { SequenceInterval, Feature } from '../domain/feature';
import type { RestrictionCloneProposal, RestrictionCloneCandidate } from '../domain/cloning';
import { analyzeRestrictionSites } from './restriction-analysis';
import { simulateRestrictionDigest } from './digest';
import { analyzeEndCompatibility } from './ligation';
import { reverseComplementIupac } from './restriction-analysis';
import { generateId } from '../utils/id';

export interface RestrictionCloneParams {
  vectorDocument: SequenceDocument;
  insertDocument: SequenceDocument;
  enzymes: RestrictionEnzyme[];
  vectorFragmentId?: string;
  insertFragmentId?: string;
}

export function extractFragmentSequence(document: SequenceDocument, fragment: DigestFragment): string {
  let seq = '';
  const docSeq = document.sequence.raw;
  for (const seg of fragment.segments) {
    if (seg.start0 <= seg.end0Exclusive) {
      seq += docSeq.slice(seg.start0, seg.end0Exclusive);
    } else {
      seq += docSeq.slice(seg.start0) + docSeq.slice(0, seg.end0Exclusive);
    }
  }
  return seq;
}

export function planRestrictionClone(params: RestrictionCloneParams): { proposal: RestrictionCloneProposal | null, error?: string } {
  const { vectorDocument, insertDocument, enzymes, vectorFragmentId, insertFragmentId } = params;

  if (enzymes.length === 0) return { proposal: null, error: 'NO_ENZYMES' };
  
  const enzymeIds = enzymes.map(e => e.id);
  const enzymeNames = enzymes.map(e => e.name);

  // Vector Digest
  const vectorSites = analyzeRestrictionSites(vectorDocument.sequence.raw, vectorDocument.topology, enzymes);
  const vectorDigest = simulateRestrictionDigest({
    sequence: vectorDocument.sequence.raw,
    topology: vectorDocument.topology,
    restrictionSites: vectorSites,
    selectedEnzymeIds: enzymeIds
  });

  if (vectorDigest.cuts.length === 0) return { proposal: null, error: 'NO_VECTOR_CUT' };

  let vectorFrag: DigestFragment;
  if (vectorFragmentId) {
    const f = vectorDigest.fragments.find(f => f.id === vectorFragmentId);
    if (!f) return { proposal: null, error: 'VECTOR_FRAGMENT_NOT_FOUND' };
    vectorFrag = f;
  } else {
    // Select largest
    vectorFrag = [...vectorDigest.fragments].sort((a, b) => b.lengthBp - a.lengthBp || a.id.localeCompare(b.id))[0];
  }

  // Insert Digest
  const insertSites = analyzeRestrictionSites(insertDocument.sequence.raw, insertDocument.topology, enzymes);
  const insertDigest = simulateRestrictionDigest({
    sequence: insertDocument.sequence.raw,
    topology: insertDocument.topology,
    restrictionSites: insertSites,
    selectedEnzymeIds: enzymeIds
  });

  if (insertDigest.cuts.length === 0) return { proposal: null, error: 'NO_INSERT_CUT' };

  let insertFrag: DigestFragment;
  if (insertFragmentId) {
    const f = insertDigest.fragments.find(f => f.id === insertFragmentId);
    if (!f) return { proposal: null, error: 'INSERT_FRAGMENT_NOT_FOUND' };
    insertFrag = f;
  } else {
    // Select restriction-bounded with no natural ends, fallback largest
    const candidates = insertDigest.fragments.filter(f => 
      f.leftEnd.type !== 'natural' && f.leftEnd.type !== 'circular' &&
      f.rightEnd.type !== 'natural' && f.rightEnd.type !== 'circular'
    );
    if (candidates.length > 0) {
      insertFrag = candidates.sort((a, b) => b.lengthBp - a.lengthBp || a.id.localeCompare(b.id))[0];
    } else {
      insertFrag = [...insertDigest.fragments].sort((a, b) => b.lengthBp - a.lengthBp || a.id.localeCompare(b.id))[0];
    }
  }

  if (insertFrag.leftEnd.type === 'natural' || insertFrag.leftEnd.type === 'circular' ||
      insertFrag.rightEnd.type === 'natural' || insertFrag.rightEnd.type === 'circular' ||
      vectorFrag.leftEnd.type === 'natural' || vectorFrag.leftEnd.type === 'circular' ||
      vectorFrag.rightEnd.type === 'natural' || vectorFrag.rightEnd.type === 'circular') {
    return { proposal: null, error: 'INCOMPATIBLE_ENDS' }; // We only clone restriction-cut ends
  }

  const vSeq = extractFragmentSequence(vectorDocument, vectorFrag);
  const iSeq = extractFragmentSequence(insertDocument, insertFrag);

  let omittedVectorFeatures = 0;
  let omittedInsertFeatures = 0;
  
  // A helper to transfer features (very simplified mapping for now - full segment overlap logic needed for prod)
  // We will assume for the MVP that features fully contained in the fragment's bounds are kept, others omitted.
  const mapFeatures = (doc: SequenceDocument, frag: DigestFragment, isReverse: boolean, offset: number) => {
     const newFeatures: Feature[] = [];
     const fragLength = frag.lengthBp;
     
     // Simplified: just map fully contained segments if single-segment.
     // In a real implementation we'd do precise circular coordinate mapping against frag.segments
     // For this MVP slice, we will implement the minimum viable transfer matching the tests requirements.
     for (const f of doc.features) {
       // Just as a placeholder for now, since this is a complex mapping
       // We'll keep it simple: if doc is linear, we can just check bounds.
       const newSegments: SequenceInterval[] = [];
       let keptAll = true;
       for (const seg of f.segments) {
         // Check if seg is fully inside one of frag's segments
         let mappedSeg: SequenceInterval | null = null;
         let fragOffset = 0;
         for (const fSeg of frag.segments) {
            let fSegStart = fSeg.start0;
            let fSegEnd = fSeg.end0Exclusive;
            let fSegLength = fSegEnd - fSegStart;
            if (fSegStart > fSegEnd) fSegLength = (doc.sequence.length - fSegStart) + fSegEnd;
            
            // Check containment... this gets complicated with origin wraps.
            // Let's use a simpler heuristic for the MVP:
            // if seg is inside [fSegStart, fSegEnd)
            if (seg.start0 >= fSegStart && seg.end0Exclusive <= fSegEnd && seg.start0 <= seg.end0Exclusive && fSegStart <= fSegEnd) {
               mappedSeg = {
                 start0: seg.start0 - fSegStart + fragOffset,
                 end0Exclusive: seg.end0Exclusive - fSegStart + fragOffset
               };
               break;
            }
            fragOffset += fSegLength;
         }
         if (mappedSeg) {
           newSegments.push(mappedSeg);
         } else {
           keptAll = false;
         }
       }
       if (keptAll && newSegments.length > 0) {
         if (isReverse) {
           // Reverse mapping
           const reversedSegments = newSegments.map(s => ({
             start0: fragLength - s.end0Exclusive,
             end0Exclusive: fragLength - s.start0
           })).reverse();
           newFeatures.push({
             ...f,
             id: generateId(),
             strand: (f.strand === 1 ? -1 : 1) as 1 | -1,
             segments: reversedSegments.map(s => ({ start0: s.start0 + offset, end0Exclusive: s.end0Exclusive + offset }))
           });
         } else {
           newFeatures.push({
             ...f,
             id: generateId(),
             segments: newSegments.map(s => ({ start0: s.start0 + offset, end0Exclusive: s.end0Exclusive + offset }))
           });
         }
       } else {
         if (doc === vectorDocument) omittedVectorFeatures++;
         if (doc === insertDocument) omittedInsertFeatures++;
       }
     }
     return newFeatures;
  };

  const candidates: RestrictionCloneCandidate[] = [];

  // Forward Orientation: Vector Right <-> Insert Left AND Insert Right <-> Vector Left
  const fwdJ1 = analyzeEndCompatibility(vectorFrag.rightEnd, insertFrag.leftEnd);
  const fwdJ2 = analyzeEndCompatibility(insertFrag.rightEnd, vectorFrag.leftEnd);
  const fwdValid = fwdJ1.isCompatible && fwdJ2.isCompatible;

  if (fwdValid || (!fwdValid && analyzeEndCompatibility(vectorFrag.rightEnd, insertFrag.rightEnd).isCompatible === false)) {
      candidates.push({
        id: generateId(),
        orientation: 'forward',
        junction1: fwdJ1,
        junction2: fwdJ2,
        isValid: fwdValid,
        recombinantLengthBp: vectorFrag.lengthBp + insertFrag.lengthBp,
        recombinantSequence: vSeq + iSeq,
        recombinantFeatures: [
          ...mapFeatures(vectorDocument, vectorFrag, false, 0),
          ...mapFeatures(insertDocument, insertFrag, false, vectorFrag.lengthBp)
        ],
        warnings: fwdValid ? [] : ['Incompatible ends in forward orientation']
      });
  }

  // Reverse Orientation: Vector Right <-> Insert Right AND Insert Left <-> Vector Left
  const revJ1 = analyzeEndCompatibility(vectorFrag.rightEnd, insertFrag.rightEnd);
  const revJ2 = analyzeEndCompatibility(insertFrag.leftEnd, vectorFrag.leftEnd);
  const revValid = revJ1.isCompatible && revJ2.isCompatible;

  if (revValid || (fwdValid === false && revValid === false && candidates.length === 0)) {
     // If both invalid and candidates is empty, just push one to have something to show in warnings
     candidates.push({
        id: generateId(),
        orientation: 'reverse',
        junction1: revJ1,
        junction2: revJ2,
        isValid: revValid,
        recombinantLengthBp: vectorFrag.lengthBp + insertFrag.lengthBp,
        recombinantSequence: vSeq + reverseComplementIupac(iSeq),
        recombinantFeatures: [
          ...mapFeatures(vectorDocument, vectorFrag, false, 0),
          ...mapFeatures(insertDocument, insertFrag, true, vectorFrag.lengthBp)
        ],
        warnings: revValid ? [] : ['Incompatible ends in reverse orientation']
      });
  }
  
  if (candidates.length === 0 && !fwdValid && !revValid) {
    return { proposal: null, error: 'INCOMPATIBLE_ENDS' };
  }

  // Filter only valid candidates if there are any
  const validCandidates = candidates.filter(c => c.isValid);
  
  if (validCandidates.length === 0) {
      return { proposal: null, error: 'INCOMPATIBLE_ENDS' };
  }

  const proposal: RestrictionCloneProposal = {
    proposalId: generateId(),
    vectorDocumentId: vectorDocument.id,
    vectorDocumentName: vectorDocument.name,
    insertDocumentId: insertDocument.id,
    insertDocumentName: insertDocument.name,
    enzymeIds,
    enzymeNames,
    vectorFragmentId: vectorFrag.id,
    vectorBackboneLengthBp: vectorFrag.lengthBp,
    insertFragmentId: insertFrag.id,
    insertLengthBp: insertFrag.lengthBp,
    candidates: validCandidates,
    warnings: [],
    sourceMetadata: {
      vectorFeaturesOmitted: omittedVectorFeatures,
      insertFeaturesOmitted: omittedInsertFeatures
    }
  };

  return { proposal };
}
