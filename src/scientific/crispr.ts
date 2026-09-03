import { reverseComplementIupac } from './restriction-analysis';
import { CRISPR_DEFAULTS } from '../config/scientific-defaults';
import { CAS_NUCLEASES, findCasNuclease, type CasNuclease, type CasNucleaseId } from '../domain/crispr';

export { CRISPR_DEFAULTS, CAS_NUCLEASES, findCasNuclease };
export type { CasNuclease, CasNucleaseId };

export interface CrisprTarget {
  id: string;
  nucleaseId: CasNucleaseId;
  nucleaseName: string;
  spacer: string;
  pam: string;
  pamOrientation: '5prime' | '3prime';
  cleavageType: 'blunt' | 'staggered';
  strand: 1 | -1;
  pamStart0: number;
  pamEnd0Exclusive: number;
  cutSite0: number; // Primary or top-strand cleavage coordinate (0-based)
  bottomCutSite0?: number; // For staggered cuts (e.g. Cas12a)
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
  nuclease?: CasNucleaseId | string;
  targetRegion?: { start0: number; end0Exclusive: number };
  minQualityScore?: number;
  maxResults?: number;
}

function matchesIupac(seq: string, pattern: string): boolean {
  if (seq.length !== pattern.length) return false;
  const IUPAC_MAP: Record<string, string> = {
    A: 'A', C: 'C', G: 'G', T: 'T', U: 'T',
    R: 'AG', Y: 'CT', S: 'GC', W: 'AT', K: 'GT', M: 'AC',
    B: 'CGT', D: 'AGT', H: 'ACT', V: 'ACG', N: 'ACGT'
  };
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i].toUpperCase();
    const s = seq[i].toUpperCase();
    const valid = IUPAC_MAP[p] || 'ACGT';
    if (!valid.includes(s)) return false;
  }
  return true;
}

export function findCrisprTargets(
  sequence: string,
  topology: 'linear' | 'circular',
  options: FindCrisprTargetsOptions = {}
): CrisprTarget[] {
  const seqUpper = sequence.toUpperCase();
  const seqLen = sequence.length;
  if (seqLen < 23) return [];

  const nuclease = findCasNuclease(options.nuclease);
  const pamLen = nuclease.pamMotif.length;
  const spacerLen = nuclease.spacerLengthBp;
  const isCircular = topology === 'circular';

  const startLimit = options.targetRegion ? Math.max(0, options.targetRegion.start0) : 0;
  const endLimit = options.targetRegion ? Math.min(seqLen, options.targetRegion.end0Exclusive) : seqLen;

  const targets: CrisprTarget[] = [];

  const getSub = (start: number, length: number): string => {
    let s = '';
    for (let k = 0; k < length; k++) {
      s += seqUpper[(start + k + seqLen * 10) % seqLen];
    }
    return s;
  };

  const isWithinTargetRegion = (pamStart: number, pamEnd: number): boolean => {
    if (!options.targetRegion) return true;
    const { start0, end0Exclusive } = options.targetRegion;
    if (isCircular && start0 > end0Exclusive) {
      return pamStart >= start0 || pamEnd <= end0Exclusive;
    }
    return pamStart >= start0 && pamEnd <= end0Exclusive;
  };

  if (nuclease.pamOrientation === '3prime') {
    // 3' PAM: [Spacer (spacerLen)] -> [PAM (pamLen)]
    // 1. Forward Strand
    const fwdStart = isCircular ? 0 : Math.max(spacerLen, startLimit);
    const fwdEnd = isCircular ? seqLen : Math.min(seqLen - pamLen + 1, endLimit);

    for (let i = fwdStart; i < fwdEnd; i++) {
      const pamEnd = isCircular ? (i + pamLen > seqLen ? (i + pamLen) % seqLen : i + pamLen) : i + pamLen;
      if (!isWithinTargetRegion(i, pamEnd)) continue;

      const pamCandidate = isCircular ? getSub(i, pamLen) : seqUpper.slice(i, i + pamLen);
      if (matchesIupac(pamCandidate, nuclease.pamMotif)) {
        const spacer = isCircular ? getSub(i - spacerLen, spacerLen) : seqUpper.slice(i - spacerLen, i);
        const cutSite0 = (i + nuclease.topCutOffsetFromPam + seqLen) % seqLen;

        const target = evaluateCrisprTarget({
          id: `crispr_${nuclease.id}_fwd_${i}`,
          nuclease,
          spacer,
          pam: pamCandidate,
          strand: 1,
          pamStart0: i,
          pamEnd0Exclusive: pamEnd,
          cutSite0,
          fullSequence: seqUpper,
          topology
        });

        if (!options.minQualityScore || target.qualityScore >= options.minQualityScore) {
          targets.push(target);
        }
      }
    }

    // 2. Reverse Strand
    const revStart = isCircular ? 0 : Math.max(0, startLimit);
    const revEnd = isCircular ? seqLen - 1 : Math.min(seqLen - spacerLen - pamLen, endLimit);

    for (let i = revStart; i <= revEnd; i++) {
      const pamEnd = isCircular ? (i + pamLen > seqLen ? (i + pamLen) % seqLen : i + pamLen) : i + pamLen;
      if (!isWithinTargetRegion(i, pamEnd)) continue;

      const pamSense = isCircular ? getSub(i, pamLen) : seqUpper.slice(i, i + pamLen);
      const pamRC = reverseComplementIupac(pamSense);

      if (matchesIupac(pamRC, nuclease.pamMotif)) {
        const rawProtospacerSense = isCircular ? getSub(i + pamLen, spacerLen) : seqUpper.slice(i + pamLen, i + pamLen + spacerLen);
        const spacer = reverseComplementIupac(rawProtospacerSense);
        const cutSite0 = (i + pamLen - nuclease.topCutOffsetFromPam + seqLen) % seqLen;

        const target = evaluateCrisprTarget({
          id: `crispr_${nuclease.id}_rev_${i}`,
          nuclease,
          spacer,
          pam: pamRC,
          strand: -1,
          pamStart0: i,
          pamEnd0Exclusive: pamEnd,
          cutSite0,
          fullSequence: seqUpper,
          topology
        });

        if (!options.minQualityScore || target.qualityScore >= options.minQualityScore) {
          targets.push(target);
        }
      }
    }
  } else {
    // 5' PAM (e.g. Cas12a TTTV): [PAM (pamLen)] -> [Spacer (spacerLen)]
    // 1. Forward Strand
    const fwdStart = isCircular ? 0 : Math.max(0, startLimit);
    const fwdEnd = isCircular ? seqLen : Math.min(seqLen - pamLen - spacerLen, endLimit);

    for (let i = fwdStart; i < fwdEnd; i++) {
      const pamEnd = isCircular ? (i + pamLen > seqLen ? (i + pamLen) % seqLen : i + pamLen) : i + pamLen;
      if (!isWithinTargetRegion(i, pamEnd)) continue;

      const pamCandidate = isCircular ? getSub(i, pamLen) : seqUpper.slice(i, i + pamLen);
      if (matchesIupac(pamCandidate, nuclease.pamMotif)) {
        const spacer = isCircular ? getSub(i + pamLen, spacerLen) : seqUpper.slice(i + pamLen, i + pamLen + spacerLen);
        const cutSite0 = (i + pamLen + nuclease.topCutOffsetFromPam + seqLen) % seqLen;
        const bottomCutSite0 = (i + pamLen + nuclease.bottomCutOffsetFromPam + seqLen) % seqLen;

        const target = evaluateCrisprTarget({
          id: `crispr_${nuclease.id}_fwd_${i}`,
          nuclease,
          spacer,
          pam: pamCandidate,
          strand: 1,
          pamStart0: i,
          pamEnd0Exclusive: pamEnd,
          cutSite0,
          bottomCutSite0,
          fullSequence: seqUpper,
          topology
        });

        if (!options.minQualityScore || target.qualityScore >= options.minQualityScore) {
          targets.push(target);
        }
      }
    }

    // 2. Reverse Strand
    const revStart = isCircular ? 0 : Math.max(spacerLen + pamLen, startLimit);
    const revEnd = isCircular ? seqLen : Math.min(seqLen, endLimit);

    for (let i = revStart; i < revEnd; i++) {
      const pamEnd = isCircular ? (i + pamLen > seqLen ? (i + pamLen) % seqLen : i + pamLen) : i + pamLen;
      if (!isWithinTargetRegion(i, pamEnd)) continue;

      const pamSense = isCircular ? getSub(i, pamLen) : seqUpper.slice(i, i + pamLen);
      const pamRC = reverseComplementIupac(pamSense);

      if (matchesIupac(pamRC, nuclease.pamMotif)) {
        const rawProtospacerSense = isCircular ? getSub(i - spacerLen, spacerLen) : seqUpper.slice(i - spacerLen, i);
        const spacer = reverseComplementIupac(rawProtospacerSense);
        const cutSite0 = (i - nuclease.topCutOffsetFromPam + seqLen) % seqLen;
        const bottomCutSite0 = (i - nuclease.bottomCutOffsetFromPam + seqLen) % seqLen;

        const target = evaluateCrisprTarget({
          id: `crispr_${nuclease.id}_rev_${i}`,
          nuclease,
          spacer,
          pam: pamRC,
          strand: -1,
          pamStart0: i,
          pamEnd0Exclusive: pamEnd,
          cutSite0,
          bottomCutSite0,
          fullSequence: seqUpper,
          topology
        });

        if (!options.minQualityScore || target.qualityScore >= options.minQualityScore) {
          targets.push(target);
        }
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
  nuclease: CasNuclease;
  spacer: string;
  pam: string;
  strand: 1 | -1;
  pamStart0: number;
  pamEnd0Exclusive: number;
  cutSite0: number;
  bottomCutSite0?: number;
  fullSequence: string;
  topology: 'linear' | 'circular';
}

function evaluateCrisprTarget(params: EvaluateTargetParams): CrisprTarget {
  const { id, nuclease, spacer, pam, strand, pamStart0, pamEnd0Exclusive, cutSite0, bottomCutSite0, fullSequence, topology } = params;

  let score = 100;
  const penalties: string[] = [];

  // 1. GC content scoring
  const gcCount = (spacer.match(/[GC]/g) || []).length;
  const gcPercent = Math.round((gcCount / spacer.length) * 100);

  const [optMin, optMax] = nuclease.optimalGcRange;
  if (gcPercent < optMin) {
    const diff = optMin - gcPercent;
    score -= diff * 1.5;
    penalties.push(`Low GC content (${gcPercent}%) below optimal ${optMin}%`);
  } else if (gcPercent > optMax) {
    const diff = gcPercent - optMax;
    score -= diff * 1.5;
    penalties.push(`High GC content (${gcPercent}%) above optimal ${optMax}%`);
  }

  // 2. Poly-T termination penalty (>= 4 consecutive Ts terminate Pol III U6 transcription)
  if (/TTTT/.test(spacer)) {
    score -= 35;
    penalties.push('Contains Poly-T tract (TTTT) that aborts U6/H1 Pol III transcription.');
  }

  // 3. Poly-G / Poly-C secondary structure penalties (>= 4 consecutive Gs or Cs)
  if (/GGGG/.test(spacer)) {
    score -= 15;
    penalties.push('Contains poly-G motif (GGGG) prone to G-quadruplex formation.');
  }
  if (/CCCC/.test(spacer)) {
    score -= 15;
    penalties.push('Contains poly-C motif (CCCC) prone to i-motif folding.');
  }

  // 4. PAM-proximal seed region GC bias (last 5nt of spacer for 3' PAM, first 5nt for 5' PAM)
  const seed = nuclease.pamOrientation === '3prime' ? spacer.slice(-5) : spacer.slice(0, 5);
  const seedGc = (seed.match(/[GC]/g) || []).length;
  if (seedGc === 0) {
    score -= 10;
    penalties.push('Weak PAM-proximal seed hybridization (<20% GC in seed).');
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // 5. Predict microhomology-mediated end joining (MMEJ) repair patterns around cut site
  const mmejDeletions = predictMmejDeletions(fullSequence, cutSite0, topology);
  const totalMmejScore = mmejDeletions.reduce((acc, d) => acc + d.score, 0);
  const frameshiftScore = mmejDeletions.filter(d => d.isFrameshift).reduce((acc, d) => acc + d.score, 0);
  const frameshiftProbability = totalMmejScore > 0 ? Math.round((frameshiftScore / totalMmejScore) * 100) / 100 : 0.67;

  return {
    id,
    nucleaseId: nuclease.id,
    nucleaseName: nuclease.name,
    spacer,
    pam,
    pamOrientation: nuclease.pamOrientation,
    cleavageType: nuclease.cleavageType,
    strand,
    pamStart0,
    pamEnd0Exclusive,
    cutSite0,
    bottomCutSite0,
    gcPercent,
    qualityScore: finalScore,
    penalties,
    mmejDeletions,
    frameshiftProbability
  };
}

function predictMmejDeletions(sequence: string, cutSite0: number, topology: 'linear' | 'circular'): MmejDeletion[] {
  const seqLen = sequence.length;
  const windowRadius = 30;

  let region: string;
  let relCut: number;

  if (topology === 'circular') {
    const leftStart = cutSite0 - windowRadius;
    const rightEnd = cutSite0 + windowRadius;
    region = '';
    for (let i = leftStart; i < rightEnd; i++) {
      const idx = (i + seqLen * 10) % seqLen;
      region += sequence[idx];
    }
    relCut = cutSite0 - leftStart;
  } else {
    const left = Math.max(0, cutSite0 - windowRadius);
    const right = Math.min(seqLen, cutSite0 + windowRadius);
    region = sequence.slice(left, right);
    relCut = cutSite0 - left;
  }

  const deletions: MmejDeletion[] = [];

  for (let len = 2; len <= 6; len++) {
    for (let l = 0; l <= relCut - len; l++) {
      const leftMotif = region.slice(l, l + len);
      for (let r = relCut; r <= region.length - len; r++) {
        const rightMotif = region.slice(r, r + len);
        if (leftMotif === rightMotif) {
          const deletionSizeBp = r - l;
          const isFrameshift = deletionSizeBp % 3 !== 0;
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
