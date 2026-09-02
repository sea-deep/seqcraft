import { reverseComplementIupac } from './restriction-analysis';

export interface CrisprTarget {
  id: string;
  spacer: string; // 20nt guide without PAM
  pam: string; // e.g. AGG, CGG, TGG, GGG
  strand: 1 | -1;
  pamStart0: number;
  pamEnd0Exclusive: number;
  cutSite0: number;
  gcPercent: number;
  qualityScore: number; // 0 - 100
  penalties: string[];
  mmejDeletions: MmejDeletion[];
  frameshiftProbability: number; // 0.0 - 1.0
}

export interface MmejDeletion {
  microhomology: string;
  lengthBp: number;
  deletionSizeBp: number;
  isFrameshift: boolean;
  score: number;
}

export interface FindCrisprTargetsOptions {
  targetRegion?: { start0: number; end0Exclusive: number };
  minQualityScore?: number;
  maxResults?: number;
}

export function findCrisprTargets(sequence: string, topology: "linear" | "circular", options: FindCrisprTargetsOptions = {}): CrisprTarget[] {
  const seqUpper = sequence.toUpperCase();
  const seqLen = sequence.length;
  if (seqLen < 23) return [];

  const startLimit = options.targetRegion ? Math.max(0, options.targetRegion.start0) : 0;
  const endLimit = options.targetRegion ? Math.min(seqLen, options.targetRegion.end0Exclusive) : seqLen;

  const targets: CrisprTarget[] = [];
  const isCircular = topology === "circular";

  const getSub = (start: number, length: number): string => {
    let s = "";
    for (let k = 0; k < length; k++) {
      s += seqUpper[(start + k + seqLen * 10) % seqLen];
    }
    return s;
  };

  // 1. Scan Forward Strand for NGG (protospacer is 20bp upstream of NGG)
  const fwdStart = isCircular ? 0 : Math.max(20, startLimit);
  const fwdEnd = isCircular ? seqLen : Math.min(seqLen - 2, endLimit);

  for (let i = fwdStart; i < fwdEnd; i++) {
    if (!isCircular && (i < startLimit || i + 3 > endLimit)) continue;

    const pam = isCircular ? getSub(i, 3) : seqUpper.slice(i, i + 3);
    const g1 = pam[1];
    const g2 = pam[2];

    if (g1 === "G" && g2 === "G") {
      const spacer = isCircular ? getSub(i - 20, 20) : seqUpper.slice(i - 20, i);
      const cutSite0 = (i - 3 + seqLen) % seqLen;

      const target = evaluateCrisprTarget({
        id: "crispr_fwd_" + i,
        spacer,
        pam,
        strand: 1,
        pamStart0: i,
        pamEnd0Exclusive: (i + 3) % seqLen,
        cutSite0,
        fullSequence: seqUpper,
        topology
      });

      if (!options.minQualityScore || target.qualityScore >= options.minQualityScore) {
        targets.push(target);
      }
    }
  }

  // 2. Scan Reverse Strand for CCN (protospacer on reverse complement)
  const revStart = isCircular ? 0 : Math.max(0, startLimit);
  const revEnd = isCircular ? seqLen : Math.min(seqLen - 23, endLimit);

  for (let i = revStart; i < revEnd; i++) {
    if (!isCircular && (i < startLimit || i + 3 > endLimit)) continue;

    const pamSense = isCircular ? getSub(i, 3) : seqUpper.slice(i, i + 3);
    const c1 = pamSense[0];
    const c2 = pamSense[1];

    if (c1 === "C" && c2 === "C") {
      const rawProtospacerSense = isCircular ? getSub(i + 3, 20) : seqUpper.slice(i + 3, i + 23);
      const spacer = reverseComplementIupac(rawProtospacerSense);
      const pam = reverseComplementIupac(pamSense);
      const cutSite0 = (i + 6) % seqLen;

      const target = evaluateCrisprTarget({
        id: "crispr_rev_" + i,
        spacer,
        pam,
        strand: -1,
        pamStart0: i,
        pamEnd0Exclusive: (i + 3) % seqLen,
        cutSite0,
        fullSequence: seqUpper,
        topology
      });

      if (!options.minQualityScore || target.qualityScore >= options.minQualityScore) {
        targets.push(target);
      }
    }
  }

  // Sort targets by quality score descending
  targets.sort((a, b) => b.qualityScore - a.qualityScore);

  const maxResults = options.maxResults ?? 50;
  return targets.slice(0, maxResults);
}

interface EvaluateTargetParams {
  id: string;
  spacer: string;
  pam: string;
  strand: 1 | -1;
  pamStart0: number;
  pamEnd0Exclusive: number;
  cutSite0: number;
  fullSequence: string;
  topology: "linear" | "circular";
}

function evaluateCrisprTarget(params: EvaluateTargetParams): CrisprTarget {
  const { id, spacer, pam, strand, pamStart0, pamEnd0Exclusive, cutSite0, fullSequence, topology } = params;
  let score = 100;
  const penalties: string[] = [];

  // GC% calculation
  const gcCount = (spacer.match(/[GC]/g) || []).length;
  const gcPercent = (gcCount / spacer.length) * 100;

  // GC penalties (ideal is 40% - 65%)
  if (gcPercent < 30) {
    score -= 25;
    penalties.push("Low GC content (<30%): risk of poor hybridization");
  } else if (gcPercent < 40) {
    score -= 10;
    penalties.push("Suboptimal GC content (30-40%)");
  } else if (gcPercent > 75) {
    score -= 25;
    penalties.push("Excessive GC content (>75%): high risk of off-targets & G-quadruplex");
  } else if (gcPercent > 65) {
    score -= 10;
    penalties.push("Elevated GC content (65-75%)");
  }

  // Poly-T penalty (U6 / H1 RNA Pol III termination signal: 4 or more Ts in a row)
  if (spacer.includes("TTTT")) {
    score -= 40;
    penalties.push("Poly-T tract (TTTT): aborts U6/H1 RNA Pol III transcription");
  } else if (spacer.includes("TTT")) {
    score -= 10;
    penalties.push("Triple-T motif (TTT): partial termination risk");
  }

  // Homopolymer runs of 4+ bases
  if (/(.)\1{3,}/.test(spacer)) {
    score -= 15;
    penalties.push("Homopolymer run (4+ identical bases): synthesis and synthesis error risk");
  }

  // Position 20 nucleotide preference (proximal to PAM)
  const base20 = spacer[19];
  if (base20 === "G") {
    score += 5; // G at 20 favored
  } else if (base20 === "T") {
    score -= 10; // T at 20 disfavored
    penalties.push("Thymine at position 20 adjacent to PAM reduces Cas9 cleavage");
  }

  // MMEJ deletion pattern analysis around cut site
  const mmejDeletions = predictMmejDeletions(fullSequence, cutSite0, topology);

  // Calculate frameshift probability from predicted MMEJ deletions
  let frameshiftScoreSum = 0;
  let totalScoreSum = 0;
  for (const del of mmejDeletions) {
    totalScoreSum += del.score;
    if (del.isFrameshift) {
      frameshiftScoreSum += del.score;
    }
  }

  // If no strong microhomologies, non-homologous end joining (NHEJ) typically produces ~66% frameshift (+1/-1/etc.)
  const frameshiftProbability = totalScoreSum > 0 ? (frameshiftScoreSum / totalScoreSum) : 0.67;

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    id,
    spacer,
    pam,
    strand,
    pamStart0,
    pamEnd0Exclusive,
    cutSite0,
    gcPercent: Math.round(gcPercent * 10) / 10,
    qualityScore: finalScore,
    penalties,
    mmejDeletions,
    frameshiftProbability: Math.round(frameshiftProbability * 100) / 100
  };
}

function predictMmejDeletions(sequence: string, cutSite0: number, topology: "linear" | "circular"): MmejDeletion[] {
  const seqLen = sequence.length;
  const windowSize = 25;
  const leftStart = topology === "circular" ? cutSite0 - windowSize : Math.max(0, cutSite0 - windowSize);
  const rightEnd = topology === "circular" ? cutSite0 + windowSize : Math.min(seqLen, cutSite0 + windowSize);

  let region = "";
  for (let i = leftStart; i < rightEnd; i++) {
    const idx = (i + seqLen * 10) % seqLen;
    region += sequence[idx];
  }

  const relCut = cutSite0 - leftStart;
  const deletions: MmejDeletion[] = [];

  // Search for microhomologies of length 2 to 6 bp on left and right of cut
  for (let len = 2; len <= 6; len++) {
    for (let l = 0; l <= relCut - len; l++) {
      const leftMotif = region.slice(l, l + len);
      for (let r = relCut; r <= region.length - len; r++) {
        const rightMotif = region.slice(r, r + len);
        if (leftMotif === rightMotif) {
          // Distance between the motifs determines deletion size
          const deletionSizeBp = r - l;
          const isFrameshift = (deletionSizeBp % 3) !== 0;
          // Weight score exponentially by microhomology length and inversely by distance
          const score = Math.round((Math.pow(2.2, len) / Math.sqrt(deletionSizeBp)) * 10) / 10;
          deletions.push({
            microhomology: leftMotif,
            lengthBp: len,
            deletionSizeBp,
            isFrameshift,
            score
          });
        }
      }
    }
  }

  // Sort by predictive score descending and deduplicate deletion sizes
  deletions.sort((a, b) => b.score - a.score);
  const seenSizes = new Set<number>();
  const uniqueDeletions: MmejDeletion[] = [];
  for (const del of deletions) {
    if (!seenSizes.has(del.deletionSizeBp)) {
      seenSizes.add(del.deletionSizeBp);
      uniqueDeletions.push(del);
      if (uniqueDeletions.length >= 5) break;
    }
  }

  return uniqueDeletions;
}
