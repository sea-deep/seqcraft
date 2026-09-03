/**
 * Canonical CRISPR Cas nuclease registry and geometric cleavage models.
 * Authoritative specifications from Doudna, Charpentier, and Zhang lab references.
 */

export const CAS_NUCLEASE_IDS = ['SpCas9', 'SaCas9', 'Cas12a', 'Cas12e'] as const;
export type CasNucleaseId = typeof CAS_NUCLEASE_IDS[number];

export interface CasNuclease {
  id: CasNucleaseId;
  name: string;
  aliases: readonly string[];
  pamMotif: string; // e.g. NGG, NNGRRT, TTTV, TTCN
  pamOrientation: '5prime' | '3prime';
  spacerLengthBp: number;
  cleavageType: 'blunt' | 'staggered';
  topCutOffsetFromPam: number;
  bottomCutOffsetFromPam: number;
  optimalGcRange: [number, number];
  description: string;
}

export const CAS_NUCLEASES: readonly CasNuclease[] = [
  {
    id: 'SpCas9',
    name: 'SpCas9 (Streptococcus pyogenes Cas9)',
    aliases: ['Cas9', 'spCas9', 'pyogenes'],
    pamMotif: 'NGG',
    pamOrientation: '3prime',
    spacerLengthBp: 20,
    cleavageType: 'blunt',
    topCutOffsetFromPam: -3,
    bottomCutOffsetFromPam: -3,
    optimalGcRange: [40, 60],
    description: "Canonical Cas9 nuclease cutting 3 bp upstream of 3' NGG PAM with blunt ends."
  },
  {
    id: 'SaCas9',
    name: 'SaCas9 (Staphylococcus aureus Cas9)',
    aliases: ['saCas9', 'aureus'],
    pamMotif: 'NNGRRT',
    pamOrientation: '3prime',
    spacerLengthBp: 21,
    cleavageType: 'blunt',
    topCutOffsetFromPam: -3,
    bottomCutOffsetFromPam: -3,
    optimalGcRange: [40, 60],
    description: "Compact Cas9 suitable for AAV delivery, recognizing 3' NNGRRT PAM."
  },
  {
    id: 'Cas12a',
    name: 'Cas12a / Cpf1 (Acidaminococcus / Lachnospiraceae)',
    aliases: ['Cpf1', 'AsCas12a', 'LbCas12a'],
    pamMotif: 'TTTV',
    pamOrientation: '5prime',
    spacerLengthBp: 23,
    cleavageType: 'staggered',
    topCutOffsetFromPam: 18,
    bottomCutOffsetFromPam: 23,
    optimalGcRange: [35, 65],
    description: "Type V CRISPR effector recognizing 5' TTTV PAM and producing 5 nt staggered cohesive overhangs."
  },
  {
    id: 'Cas12e',
    name: 'Cas12e / CasX (Planctomycetes / Deltaproteobacteria)',
    aliases: ['CasX', 'casX'],
    pamMotif: 'TTCN',
    pamOrientation: '5prime',
    spacerLengthBp: 20,
    cleavageType: 'staggered',
    topCutOffsetFromPam: 12,
    bottomCutOffsetFromPam: 14,
    optimalGcRange: [35, 65],
    description: "Ultra-compact Type V CasX nuclease recognizing 5' TTCN PAM."
  }
] as const;

export function findCasNuclease(nameOrId?: string): CasNuclease {
  if (!nameOrId || typeof nameOrId !== 'string') return CAS_NUCLEASES[0];
  const q = nameOrId.trim().toLowerCase();
  const match = CAS_NUCLEASES.find(n =>
    n.id.toLowerCase() === q ||
    n.name.toLowerCase() === q ||
    n.aliases.some(a => a.toLowerCase() === q)
  );
  return match || CAS_NUCLEASES[0];
}
