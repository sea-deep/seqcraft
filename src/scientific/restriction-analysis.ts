import type { RestrictionEnzyme } from '../domain/restriction';

export interface RestrictionSite {
  id: string; // e.g. "EcoRI-123-1"
  enzymeId: string;
  enzymeName: string;
  start0: number; // 0-based start of the matched recognition sequence
  end0Exclusive: number; // 0-based end
  strand: 1 | -1;
  recognitionSequence: string; 
  forwardCut0: number;
  reverseCut0: number;
}

const IUPAC_TO_REGEX: Record<string, string> = {
  A: 'A', C: 'C', G: 'G', T: 'T', U: 'T',
  R: '[AG]', Y: '[CT]', S: '[GC]', W: '[AT]', K: '[GT]', M: '[AC]',
  B: '[CGT]', D: '[AGT]', H: '[ACT]', V: '[ACG]', N: '[ACGT]'
};

const IUPAC_RC_MAP: Record<string, string> = {
  A: 'T', C: 'G', G: 'C', T: 'A', U: 'A',
  R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K',
  B: 'V', D: 'H', H: 'D', V: 'B', N: 'N'
};

export function reverseComplementIupac(seq: string): string {
  return seq.toUpperCase().split('').map(c => IUPAC_RC_MAP[c] || c).reverse().join('');
}

export function iupacToRegex(seq: string): RegExp {
  const pattern = seq.toUpperCase().split('').map(c => IUPAC_TO_REGEX[c] || c).join('');
  return new RegExp(pattern, 'gi');
}

const IUPAC_MASK: Record<string, number> = {
  A: 0b0001, C: 0b0010, G: 0b0100, T: 0b1000, U: 0b1000,
  R: 0b0101, Y: 0b1010, S: 0b0110, W: 0b1001,
  K: 0b1100, M: 0b0011, B: 0b1110, D: 0b1101,
  H: 0b1011, V: 0b0111, N: 0b1111,
};

export function findIupacMatchStarts(
  sequence: string,
  pattern: string,
  maxStartExclusive = sequence.length,
): number[] {
  const reference = sequence.toUpperCase();
  const query = pattern.toUpperCase();
  const matches: number[] = [];
  const lastStart = Math.min(
    maxStartExclusive,
    reference.length - query.length + 1,
  );

  for (let start = 0; start < lastStart; start++) {
    let compatible = true;
    for (let offset = 0; offset < query.length; offset++) {
      const referenceMask = IUPAC_MASK[reference[start + offset]];
      const queryMask = IUPAC_MASK[query[offset]];
      if (!referenceMask || !queryMask || (referenceMask & queryMask) === 0) {
        compatible = false;
        break;
      }
    }
    if (compatible) matches.push(start);
  }
  return matches;
}

export function analyzeRestrictionSites(
  sequence: string,
  topology: 'linear' | 'circular',
  enzymes: RestrictionEnzyme[]
): RestrictionSite[] {
  const seqLen = sequence.length;
  if (seqLen === 0) return [];

  const hits: RestrictionSite[] = [];

  for (const enzyme of enzymes) {
    const fwdSeq = enzyme.recognitionSequence.toUpperCase();
    const revSeq = reverseComplementIupac(fwdSeq);
    const isPalindromic = fwdSeq === revSeq;
    const patternLen = fwdSeq.length;

    let searchSeq = sequence;
    if (topology === 'circular' && seqLen >= patternLen) {
      searchSeq += sequence.slice(0, patternLen - 1);
    }

    const findMatches = (iupac: string, strand: 1 | -1) => {
      for (const matchStart of findIupacMatchStarts(searchSeq, iupac, seqLen)) {
        const matchEnd = matchStart + patternLen;
        const start0 = matchStart;
        const end0Exclusive = matchEnd <= seqLen ? matchEnd : matchEnd % seqLen;

        let forwardCut0: number;
        let reverseCut0: number;

        if (strand === 1) {
          forwardCut0 = (start0 + enzyme.forwardCutOffset) % seqLen;
          reverseCut0 = (start0 + enzyme.reverseCutOffset) % seqLen;
        } else {
          forwardCut0 = (matchEnd - enzyme.reverseCutOffset + seqLen) % seqLen;
          reverseCut0 = (matchEnd - enzyme.forwardCutOffset + seqLen) % seqLen;
        }

        hits.push({
          id: `${enzyme.id}-${start0}-${strand}`,
          enzymeId: enzyme.id,
          enzymeName: enzyme.name,
          start0,
          end0Exclusive,
          strand,
          recognitionSequence: fwdSeq,
          forwardCut0,
          reverseCut0
        });
      }
    };

    findMatches(fwdSeq, 1);
    if (!isPalindromic) {
      findMatches(revSeq, -1);
    }
  }

  // Deterministic sort: start0 -> enzymeName -> strand
  hits.sort((a, b) => {
    if (a.start0 !== b.start0) return a.start0 - b.start0;
    if (a.enzymeName !== b.enzymeName) return a.enzymeName.localeCompare(b.enzymeName);
    return a.strand - b.strand;
  });

  return hits;
}

export function getUniqueCutters(sites: RestrictionSite[]): RestrictionSite[] {
  const counts = new Map<string, number>();
  for (const site of sites) counts.set(site.enzymeId, (counts.get(site.enzymeId) || 0) + 1);
  return sites.filter(site => counts.get(site.enzymeId) === 1);
}

export function getDoubleCutters(sites: RestrictionSite[]): RestrictionSite[] {
  const counts = new Map<string, number>();
  for (const site of sites) counts.set(site.enzymeId, (counts.get(site.enzymeId) || 0) + 1);
  return sites.filter(site => counts.get(site.enzymeId) === 2);
}

export function getNonCutters(enzymes: RestrictionEnzyme[], sites: RestrictionSite[]): RestrictionEnzyme[] {
  const cutEnzymeIds = new Set(sites.map(s => s.enzymeId));
  return enzymes.filter(e => !cutEnzymeIds.has(e.id));
}

export type EndType = "5' overhang" | "3' overhang" | "blunt";

export function getEndType(enzyme: RestrictionEnzyme): EndType {
  if (enzyme.forwardCutOffset < enzyme.reverseCutOffset) {
    return "5' overhang";
  } else if (enzyme.forwardCutOffset > enzyme.reverseCutOffset) {
    return "3' overhang";
  } else {
    return "blunt";
  }
}
