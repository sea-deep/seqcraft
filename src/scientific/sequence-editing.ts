import type { Feature, SequenceInterval } from "../domain/feature";
import { reverseComplementIupac } from "./restriction-analysis";
import { ScientificSequence } from "./nucleotide";

export type SequenceEditAction = 
  | { type: "insert"; index0: number; sequence: string }
  | { type: "delete"; start0: number; end0Exclusive: number }
  | { type: "replace"; start0: number; end0Exclusive: number; replacement: string }
  | { type: "reverse_complement"; start0: number; end0Exclusive: number }
  | { type: "rotate_origin"; newOrigin0: number };

export interface SequenceEditResult {
  newSequence: string;
  newLength: number;
  newFeatures: Feature[];
  summary: string;
  actionType: string;
}

export const COMMON_BIO_MOTIFS = [
  { name: "His-6 Tag", sequence: "CATCATCATCATCATCAT", category: "Affinity Tag", note: "6x Histidine polyhistidine purification tag" },
  { name: "FLAG Tag", sequence: "GACTACAAAGACGATGACGACAAG", category: "Epitope Tag", note: "Enterokinase-cleavable antibody epitope" },
  { name: "HA Tag", sequence: "TACCCATACGATGTTCCAGATTACGCT", category: "Epitope Tag", note: "Influenza hemagglutinin epitope" },
  { name: "Myc Tag", sequence: "GAACAAAAACTCATCTCAGAAGAGGATCTG", category: "Epitope Tag", note: "c-Myc proto-oncogene epitope" },
  { name: "TEV Protease Site", sequence: "GAAAACCTGTATTTTCAGAGC", category: "Cleavage Site", note: "ENLYFQS sequence recognized by Tobacco Etch Virus protease" },
  { name: "Kozak Consensus", sequence: "GCCACCATGG", category: "Translation Initiation", note: "Vertebrate ribosome binding consensus" },
  { name: "T7 Promoter", sequence: "TAATACGACTCACTATAGGG", category: "Transcription Promoter", note: "High-level in vitro / bacterial transcription" },
  { name: "Flexible Linker (GGGGS)3", sequence: "GGTGGCGGTGGCTCGGGCGGTGGTGGGTCGGGTGGCGGCGGATCT", category: "Protein Linker", note: "15aa flexible (Gly4Ser)3 linker" }
];

/**
 * Execute coordinate-aware sequence modifications.
 */
export function editSequence(
  currentSequence: string,
  features: Feature[],
  action: SequenceEditAction,
  topology: "linear" | "circular" = "circular"
): SequenceEditResult {
  const origLen = currentSequence.length;

  switch (action.type) {
    case "insert": {
      const { index0, sequence } = action;
      if (index0 < 0 || index0 > origLen) {
        throw new RangeError(`Insertion index ${index0} out of bounds [0, ${origLen}]`);
      }
      const cleanSeq = sequence.trim().toUpperCase().replace(/\s+/g, "");
      // Validate alphabet
      new ScientificSequence(cleanSeq, "DNA");
      const insertLen = cleanSeq.length;

      const newSequence = currentSequence.slice(0, index0) + cleanSeq + currentSequence.slice(index0);
      const newFeatures = transformFeaturesOnInsert(features, index0, insertLen);

      return {
        newSequence,
        newLength: newSequence.length,
        newFeatures,
        summary: `Inserted ${insertLen} bp at position ${index0 + 1}`,
        actionType: "insert"
      };
    }

    case "delete": {
      const { start0, end0Exclusive } = action;
      validateRange(start0, end0Exclusive, origLen);
      const deleteLen = end0Exclusive - start0;
      if (deleteLen === 0) {
        return {
          newSequence: currentSequence,
          newLength: origLen,
          newFeatures: structuredClone(features),
          summary: "No bases deleted (0 bp range)",
          actionType: "delete"
        };
      }

      const newSequence = currentSequence.slice(0, start0) + currentSequence.slice(end0Exclusive);
      const newFeatures = transformFeaturesOnDelete(features, start0, end0Exclusive);

      return {
        newSequence,
        newLength: newSequence.length,
        newFeatures,
        summary: `Deleted ${deleteLen} bp from ${start0 + 1} to ${end0Exclusive}`,
        actionType: "delete"
      };
    }

    case "replace": {
      const { start0, end0Exclusive, replacement } = action;
      validateRange(start0, end0Exclusive, origLen);
      const cleanRep = replacement.trim().toUpperCase().replace(/\s+/g, "");
      new ScientificSequence(cleanRep, "DNA");
      
      const deleteLen = end0Exclusive - start0;
      const insertLen = cleanRep.length;

      const newSequence = currentSequence.slice(0, start0) + cleanRep + currentSequence.slice(end0Exclusive);
      
      // Transform: delete followed by insert at start0
      const afterDelete = transformFeaturesOnDelete(features, start0, end0Exclusive);
      const newFeatures = transformFeaturesOnInsert(afterDelete, start0, insertLen);

      return {
        newSequence,
        newLength: newSequence.length,
        newFeatures,
        summary: `Replaced ${deleteLen} bp with ${insertLen} bp at ${start0 + 1}–${end0Exclusive}`,
        actionType: "replace"
      };
    }

    case "reverse_complement": {
      const { start0, end0Exclusive } = action;
      validateRange(start0, end0Exclusive, origLen);
      const targetSeq = currentSequence.slice(start0, end0Exclusive);
      const inverted = reverseComplementIupac(targetSeq);

      const newSequence = currentSequence.slice(0, start0) + inverted + currentSequence.slice(end0Exclusive);
      const newFeatures = transformFeaturesOnReverseComplement(features, start0, end0Exclusive);

      return {
        newSequence,
        newLength: origLen,
        newFeatures,
        summary: `Reverse complemented ${end0Exclusive - start0} bp region ${start0 + 1}–${end0Exclusive}`,
        actionType: "reverse_complement"
      };
    }

    case "rotate_origin": {
      if (topology !== "circular") {
        throw new Error("Cannot rotate origin of a linear sequence");
      }
      const { newOrigin0 } = action;
      if (newOrigin0 < 0 || newOrigin0 >= origLen) {
        throw new RangeError(`New origin index ${newOrigin0} out of bounds [0, ${origLen - 1}]`);
      }
      if (newOrigin0 === 0) {
        return {
          newSequence: currentSequence,
          newLength: origLen,
          newFeatures: structuredClone(features),
          summary: "Origin unchanged at position 1",
          actionType: "rotate_origin"
        };
      }

      const newSequence = currentSequence.slice(newOrigin0) + currentSequence.slice(0, newOrigin0);
      const newFeatures = transformFeaturesOnRotateOrigin(features, newOrigin0, origLen);

      return {
        newSequence,
        newLength: origLen,
        newFeatures,
        summary: `Rotated circular origin to position ${newOrigin0 + 1}`,
        actionType: "rotate_origin"
      };
    }
  }
}

function validateRange(start0: number, end0Exclusive: number, len: number): void {
  if (start0 < 0 || end0Exclusive < 0 || start0 > len || end0Exclusive > len) {
    throw new RangeError(`Range [${start0}, ${end0Exclusive}) out of bounds for sequence of length ${len}`);
  }
  if (start0 > end0Exclusive) {
    throw new RangeError(`Invalid range: start0 (${start0}) cannot exceed end0Exclusive (${end0Exclusive})`);
  }
}

function transformFeaturesOnInsert(features: Feature[], index0: number, insertLen: number): Feature[] {
  return features.map(f => {
    const updatedSegments: SequenceInterval[] = f.segments.map(seg => {
      if (seg.end0Exclusive <= index0) {
        return { ...seg };
      }
      if (seg.start0 >= index0) {
        return {
          start0: seg.start0 + insertLen,
          end0Exclusive: seg.end0Exclusive + insertLen
        };
      }
      // Spans the insertion point
      return {
        start0: seg.start0,
        end0Exclusive: seg.end0Exclusive + insertLen
      };
    });

    return {
      ...f,
      segments: updatedSegments
    };
  });
}

function transformFeaturesOnDelete(features: Feature[], delStart0: number, delEnd0Exclusive: number): Feature[] {
  const deleteLen = delEnd0Exclusive - delStart0;
  const result: Feature[] = [];

  for (const f of features) {
    const updatedSegments: SequenceInterval[] = [];

    for (const seg of f.segments) {
      // 1. Completely before deletion
      if (seg.end0Exclusive <= delStart0) {
        updatedSegments.push({ ...seg });
      }
      // 2. Completely after deletion
      else if (seg.start0 >= delEnd0Exclusive) {
        updatedSegments.push({
          start0: seg.start0 - deleteLen,
          end0Exclusive: seg.end0Exclusive - deleteLen
        });
      }
      // 3. Completely swallowed inside deletion
      else if (seg.start0 >= delStart0 && seg.end0Exclusive <= delEnd0Exclusive) {
        // Discarded
      }
      // 4. Spans entire deletion (starts before, ends after)
      else if (seg.start0 < delStart0 && seg.end0Exclusive > delEnd0Exclusive) {
        updatedSegments.push({
          start0: seg.start0,
          end0Exclusive: seg.end0Exclusive - deleteLen
        });
      }
      // 5. Clipped on right (starts before, ends inside deletion)
      else if (seg.start0 < delStart0 && seg.end0Exclusive <= delEnd0Exclusive) {
        if (delStart0 > seg.start0) {
          updatedSegments.push({
            start0: seg.start0,
            end0Exclusive: delStart0
          });
        }
      }
      // 6. Clipped on left (starts inside deletion, ends after)
      else if (seg.start0 < delEnd0Exclusive && seg.end0Exclusive > delEnd0Exclusive) {
        const remainingLen = seg.end0Exclusive - delEnd0Exclusive;
        if (remainingLen > 0) {
          updatedSegments.push({
            start0: delStart0,
            end0Exclusive: delStart0 + remainingLen
          });
        }
      }
    }

    if (updatedSegments.length > 0) {
      result.push({
        ...f,
        segments: updatedSegments
      });
    }
  }

  return result;
}

function transformFeaturesOnReverseComplement(features: Feature[], start0: number, end0Exclusive: number): Feature[] {
  return features.map(f => {
    // Only invert feature segments if the feature falls entirely inside the inverted region
    const allInside = f.segments.every(s => s.start0 >= start0 && s.end0Exclusive <= end0Exclusive);

    if (allInside) {
      const newSegments = f.segments.map(s => ({
        start0: start0 + (end0Exclusive - s.end0Exclusive),
        end0Exclusive: start0 + (end0Exclusive - s.start0)
      })).sort((a, b) => a.start0 - b.start0);

      return {
        ...f,
        strand: (f.strand === 1 ? -1 : 1) as (1 | -1),
        segments: newSegments
      };
    }

    return f;
  });
}

function transformFeaturesOnRotateOrigin(features: Feature[], newOrigin0: number, len: number): Feature[] {
  return features.map(f => {
    const newSegments: SequenceInterval[] = [];

    for (const s of f.segments) {
      const segLen = s.end0Exclusive - s.start0;
      const rotatedStart = (s.start0 - newOrigin0 + len) % len;
      const rotatedEnd = rotatedStart + segLen;

      if (rotatedEnd <= len) {
        newSegments.push({ start0: rotatedStart, end0Exclusive: rotatedEnd });
      } else {
        // Crosses the new circular origin! Split into two segments
        newSegments.push({ start0: rotatedStart, end0Exclusive: len });
        newSegments.push({ start0: 0, end0Exclusive: rotatedEnd - len });
      }
    }

    return {
      ...f,
      segments: newSegments.sort((a, b) => a.start0 - b.start0)
    };
  });
}
