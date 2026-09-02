import { reverseComplementIupac } from "./restriction-analysis";
import type { Feature } from "../domain/feature";

export interface TypeIISEnzyme {
  id: string;
  name: string;
  recognitionSequence: string; // e.g. GGTCTC
  topCutOffset: number; // e.g. 1
  bottomCutOffset: number; // e.g. 5
  overhangLength: number; // e.g. 4
  overhangPolarity: "5prime" | "3prime";
}

export const TYPE_IIS_ENZYMES: TypeIISEnzyme[] = [
  {
    id: "bsai",
    name: "BsaI",
    recognitionSequence: "GGTCTC",
    topCutOffset: 1,
    bottomCutOffset: 5,
    overhangLength: 4,
    overhangPolarity: "5prime"
  },
  {
    id: "bsmbi",
    name: "BsmBI",
    recognitionSequence: "CGTCTC",
    topCutOffset: 1,
    bottomCutOffset: 5,
    overhangLength: 4,
    overhangPolarity: "5prime"
  },
  {
    id: "bbsi",
    name: "BbsI",
    recognitionSequence: "GAAGAC",
    topCutOffset: 2,
    bottomCutOffset: 6,
    overhangLength: 4,
    overhangPolarity: "5prime"
  },
  {
    id: "paqci",
    name: "PaqCI",
    recognitionSequence: "CACCTGC",
    topCutOffset: 4,
    bottomCutOffset: 8,
    overhangLength: 4,
    overhangPolarity: "5prime"
  },
  {
    id: "sapi",
    name: "SapI",
    recognitionSequence: "GCTCTTC",
    topCutOffset: 1,
    bottomCutOffset: 4,
    overhangLength: 3,
    overhangPolarity: "5prime"
  }
];

export interface GoldenGatePart {
  id: string;
  name: string;
  sequence: string;
  features?: Feature[];
}

export interface DigestedPart {
  partId: string;
  partName: string;
  bodySequence: string;
  leftOverhang: string; // 5' overhang sequence
  rightOverhang: string; // 5' overhang sequence
  features: Feature[];
}

export interface AssemblyJunction {
  upstreamPartName: string;
  downstreamPartName: string;
  overhang: string;
  isCompatible: boolean;
}

export interface GoldenGateAssemblyResult {
  success: boolean;
  recombinantSequence: string;
  topology: "circular" | "linear";
  junctions: AssemblyJunction[];
  assembledFeatures: Feature[];
  orderedPartNames: string[];
  errorMessage?: string;
}

/**
 * Extract body and overhangs from a part flanked by inward-facing Type IIS sites.
 */
export function digestPartWithTypeIIS(
  part: GoldenGatePart,
  enzyme: TypeIISEnzyme
): { success: boolean; digested?: DigestedPart; error?: string } {
  const seq = part.sequence.toUpperCase();
  const fwdSite = enzyme.recognitionSequence;
  const revSite = reverseComplementIupac(enzyme.recognitionSequence);

  const fwdIdx = seq.indexOf(fwdSite);
  const revIdx = seq.lastIndexOf(revSite);

  if (fwdIdx === -1 || revIdx === -1) {
    return {
      success: false,
      error: `Part "${part.name}" must contain both forward (${fwdSite}) and reverse (${revSite}) ${enzyme.name} recognition sites.`
    };
  }

  if (fwdIdx >= revIdx) {
    return {
      success: false,
      error: `Inward-facing ${enzyme.name} sites not found in correct orientation in "${part.name}".`
    };
  }

  // Check for internal Type IIS sites that would fragment the part during assembly
  const nextFwd = seq.indexOf(fwdSite, fwdIdx + 1);
  if (nextFwd !== -1 && nextFwd < revIdx) {
    return {
      success: false,
      error: `Part "${part.name}" contains an internal forward ${enzyme.name} site (${fwdSite}) at position ${nextFwd + 1}. Domestication required before assembly.`
    };
  }

  const prevRev = seq.lastIndexOf(revSite, revIdx - 1);
  if (prevRev !== -1 && prevRev > fwdIdx) {
    return {
      success: false,
      error: `Part "${part.name}" contains an internal reverse ${enzyme.name} site (${revSite}) at position ${prevRev + 1}. Domestication required before assembly.`
    };
  }

  // Left cut: after fwdSite + topCutOffset
  // For BsaI (GGTCTC 1/5): fwdIdx + 6 + 1 is left overhang start; length is 4
  const leftOverhangStart = fwdIdx + fwdSite.length + enzyme.topCutOffset;
  const leftOverhang = seq.slice(leftOverhangStart, leftOverhangStart + enzyme.overhangLength);

  // Right cut: before revSite
  // Top strand cut for reverse site: revIdx - enzyme.topCutOffset - enzyme.overhangLength
  const rightOverhangStart = revIdx - enzyme.bottomCutOffset;
  const rightOverhang = seq.slice(rightOverhangStart, rightOverhangStart + enzyme.overhangLength);

  // The scarless body is from leftOverhangStart to rightOverhangStart + enzyme.overhangLength
  const bodySequence = seq.slice(leftOverhangStart, rightOverhangStart + enzyme.overhangLength);

  // Map existing features that fall inside the body
  const mappedFeatures: Feature[] = [];
  if (part.features) {
    for (const feat of part.features) {
      const segs = feat.segments.filter((s: { start0: number; end0Exclusive: number }) => s.start0 >= leftOverhangStart && s.end0Exclusive <= rightOverhangStart + enzyme.overhangLength);
      if (segs.length > 0) {
        mappedFeatures.push({
          ...feat,
          segments: segs.map((s: { start0: number; end0Exclusive: number }) => ({
            start0: s.start0 - leftOverhangStart,
            end0Exclusive: s.end0Exclusive - leftOverhangStart
          }))
        });
      }
    }
  }

  return {
    success: true,
    digested: {
      partId: part.id,
      partName: part.name,
      bodySequence,
      leftOverhang,
      rightOverhang,
      features: mappedFeatures
    }
  };
}

/**
 * Simulate Golden Gate assembly from an ordered set of parts.
 */
export function assembleGoldenGate(
  parts: GoldenGatePart[],
  enzyme: TypeIISEnzyme,
  topology: "circular" | "linear" = "circular"
): GoldenGateAssemblyResult {
  if (parts.length < 2) {
    return {
      success: false,
      recombinantSequence: "",
      topology,
      junctions: [],
      assembledFeatures: [],
      orderedPartNames: [],
      errorMessage: "Golden Gate assembly requires at least 2 parts."
    };
  }

  const digestedParts: DigestedPart[] = [];
  for (const p of parts) {
    const res = digestPartWithTypeIIS(p, enzyme);
    if (!res.success || !res.digested) {
      return {
        success: false,
        recombinantSequence: "",
        topology,
        junctions: [],
        assembledFeatures: [],
        orderedPartNames: [],
        errorMessage: res.error || `Failed to digest part "${p.name}".`
      };
    }
    digestedParts.push(res.digested);
  }

  // Validate junctions:
  // For each part i, its rightOverhang must be complementary or identical to the leftOverhang of part i+1
  const junctions: AssemblyJunction[] = [];
  let currentOffset = 0;
  let fullSeq = "";
  const assembledFeatures: Feature[] = [];

  for (let i = 0; i < digestedParts.length; i++) {
    const curr = digestedParts[i];
    const next = digestedParts[(i + 1) % digestedParts.length];

    if (i === digestedParts.length - 1 && topology === "linear") {
      // Linear assembly does not close final junction
      break;
    }

    // In 5' overhang standard: Part A right overhang must equal Part B left overhang
    const isCompatible = curr.rightOverhang === next.leftOverhang;
    junctions.push({
      upstreamPartName: curr.partName,
      downstreamPartName: next.partName,
      overhang: curr.rightOverhang,
      isCompatible
    });

    if (!isCompatible) {
      return {
        success: false,
        recombinantSequence: "",
        topology,
        junctions,
        assembledFeatures: [],
        orderedPartNames: parts.map(p => p.name),
        errorMessage: `Incompatible Golden Gate junction between "${curr.partName}" (right overhang: ${curr.rightOverhang}) and "${next.partName}" (left overhang: ${next.leftOverhang}).`
      };
    }
  }

  // Assemble the body sequences. Since overhangs overlap between adjacent parts:
  // Part 0 contributes full body.
  // Part 1 contributes body without its leftOverhang (which is already provided by Part 0's rightOverhang).
  for (let i = 0; i < digestedParts.length; i++) {
    const part = digestedParts[i];
    const partBody = i === 0 ? part.bodySequence : part.bodySequence.slice(enzyme.overhangLength);
    const partOffset = currentOffset;

    for (const f of part.features) {
      assembledFeatures.push({
        ...f,
        segments: f.segments.map((s: { start0: number; end0Exclusive: number }) => ({
          start0: s.start0 + partOffset - (i === 0 ? 0 : enzyme.overhangLength),
          end0Exclusive: s.end0Exclusive + partOffset - (i === 0 ? 0 : enzyme.overhangLength)
        }))
      });
    }

    fullSeq += partBody;
    currentOffset += partBody.length;
  }

  // If circular, the last part's right overhang is identical to the first part's left overhang,
  // so we trim the redundant duplicate overhang from the end if present
  if (topology === "circular") {
    const firstLeft = digestedParts[0].leftOverhang;
    if (fullSeq.endsWith(firstLeft)) {
      fullSeq = fullSeq.slice(0, fullSeq.length - firstLeft.length);
    }
  }

  return {
    success: true,
    recombinantSequence: fullSeq,
    topology,
    junctions,
    assembledFeatures,
    orderedPartNames: parts.map(p => p.name)
  };
}

/**
 * Standard Genetic Code Table for Domestication
 */
const CODON_TABLE: Record<string, string> = {
  "TTT":"F","TTC":"F","TTA":"L","TTG":"L","CTT":"L","CTC":"L","CTA":"L","CTG":"L",
  "ATT":"I","ATC":"I","ATA":"I","ATG":"M","GTT":"V","GTC":"V","GTA":"V","GTG":"V",
  "TCT":"S","TCC":"S","TCA":"S","TCG":"S","CCT":"P","CCC":"P","CCA":"P","CCG":"P",
  "ACT":"T","ACC":"T","ACA":"T","ACG":"T","GCT":"A","GCC":"A","GCA":"A","GCG":"A",
  "TAT":"Y","TAC":"Y","TAA":"*","TAG":"*","CAT":"H","CAC":"H","CAA":"Q","CAG":"Q",
  "AAT":"N","AAC":"N","AAA":"K","AAG":"K","GAT":"D","GAC":"D","GAA":"E","GAG":"E",
  "TGT":"C","TGC":"C","TGA":"*","TGG":"W","CGT":"R","CGC":"R","CGA":"R","CGG":"R",
  "AGT":"S","AGC":"S","AGA":"R","AGG":"R","GGT":"G","GGC":"G","GGA":"G","GGG":"G"
};

export interface DomesticationMutation {
  position1: number;
  originalBase: string;
  mutatedBase: string;
  codonIndex: number;
  originalCodon: string;
  mutatedCodon: string;
  aminoAcid: string;
  isSynonymous: boolean;
}

export interface DomesticationResult {
  hasInternalSites: boolean;
  enzymeName: string;
  siteCount: number;
  domesticatedSequence: string;
  mutations: DomesticationMutation[];
  summary: string;
}

/**
 * Domesticate a sequence by introducing synonymous/silent mutations into internal Type IIS sites.
 */
export function domesticateSequence(
  sequence: string,
  enzyme: TypeIISEnzyme,
  readingFrame: 1 | 2 | 3 = 1
): DomesticationResult {
  const seqUpper = sequence.toUpperCase();
  const fwdSite = enzyme.recognitionSequence;
  const revSite = reverseComplementIupac(enzyme.recognitionSequence);

  let currentSeq = seqUpper;
  const mutations: DomesticationMutation[] = [];
  const frameOffset = readingFrame - 1;

  // Scan and mutate until no more sites exist
  let iteration = 0;
  while (iteration < 20) {
    iteration++;
    const fwdIdx = currentSeq.indexOf(fwdSite);
    const revIdx = currentSeq.indexOf(revSite);

    if (fwdIdx === -1 && revIdx === -1) break;

    const siteIdx = fwdIdx !== -1 ? fwdIdx : revIdx;
    const siteLen = fwdSite.length;

    let mutationMade = false;

    // Try each position in the recognition site
    for (let p = 0; p < siteLen; p++) {
      const pos0 = siteIdx + p;
      const relFrame = (pos0 - frameOffset) % 3;
      const codonStart0 = pos0 - (relFrame >= 0 ? relFrame : relFrame + 3);

      if (codonStart0 < 0 || codonStart0 + 3 > currentSeq.length) {
        // Non-coding or edge base: simple transition mutation (A<->G, C<->T)
        const origBase = currentSeq[pos0];
        const newBase = origBase === "A" ? "G" : origBase === "G" ? "A" : origBase === "C" ? "T" : "C";
        const mutatedSeq = currentSeq.slice(0, pos0) + newBase + currentSeq.slice(pos0 + 1);
        if (!mutatedSeq.slice(siteIdx, siteIdx + siteLen).includes(fwdSite) &&
            !mutatedSeq.slice(siteIdx, siteIdx + siteLen).includes(revSite)) {
          currentSeq = mutatedSeq;
          mutations.push({
            position1: pos0 + 1,
            originalBase: origBase,
            mutatedBase: newBase,
            codonIndex: Math.floor(pos0 / 3) + 1,
            originalCodon: "N/A",
            mutatedCodon: "N/A",
            aminoAcid: "N/A",
            isSynonymous: true
          });
          mutationMade = true;
          break;
        }
        continue;
      }

      const origCodon = currentSeq.slice(codonStart0, codonStart0 + 3);
      const origAA = CODON_TABLE[origCodon];
      const codonPos = pos0 - codonStart0;

      // Test alternative bases (A, C, G, T)
      const bases = ["T", "C", "A", "G"].filter(b => b !== currentSeq[pos0]);
      for (const altBase of bases) {
        const candidateCodon = origCodon.slice(0, codonPos) + altBase + origCodon.slice(codonPos + 1);
        const candidateAA = CODON_TABLE[candidateCodon];

        // Must be synonymous
        if (candidateAA === origAA) {
          const testSeq = currentSeq.slice(0, pos0) + altBase + currentSeq.slice(pos0 + 1);
          // Check that site is eliminated
          if (!testSeq.slice(siteIdx, siteIdx + siteLen).includes(fwdSite) &&
              !testSeq.slice(siteIdx, siteIdx + siteLen).includes(revSite)) {
            currentSeq = testSeq;
            mutations.push({
              position1: pos0 + 1,
              originalBase: origCodon[codonPos],
              mutatedBase: altBase,
              codonIndex: Math.floor(codonStart0 / 3) + 1,
              originalCodon: origCodon,
              mutatedCodon: candidateCodon,
              aminoAcid: origAA,
              isSynonymous: true
            });
            mutationMade = true;
            break;
          }
        }
      }
      if (mutationMade) break;
    }

    if (!mutationMade) {
      // Fail closed: Do NOT alter the protein sequence if synonymous mutation is not possible
      return {
        hasInternalSites: true,
        enzymeName: enzyme.name,
        siteCount: mutations.length + 1,
        domesticatedSequence: sequence,
        mutations: [],
        summary: `Domestication failed: internal ${enzyme.name} site at position ${siteIdx + 1} cannot be eliminated with synonymous codons in frame ${readingFrame} without altering the amino acid sequence.`
      };
    }
  }

  const hasInternalSites = mutations.length > 0;

  let summary: string;
  if (!hasInternalSites) {
    summary = `No internal ${enzyme.name} sites detected. Sequence is already domesticated.`;
  } else {
    summary = `Domesticated ${mutations.length} internal ${enzyme.name} recognition site(s) via synonymous codon mutations (100% amino acid sequence preserved).`;
  }

  return {
    hasInternalSites,
    enzymeName: enzyme.name,
    siteCount: mutations.length,
    domesticatedSequence: currentSeq,
    mutations,
    summary
  };
}
