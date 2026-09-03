import { useMemo } from 'react';
import type { PlasmidLocus } from './HeroPlasmidMap';
import { Scissors } from 'lucide-react';

interface HeroSequenceStripProps {
  selectedLocus: PlasmidLocus;
  className?: string;
}

interface NucleotideTriplet {
  codon: string;
  comp: string;
  aa: string;
  bp: number;
  cutSite?: string;
}

const MCS_TRIPLETS: NucleotideTriplet[] = [
  { codon: 'GAA', comp: 'CTT', aa: 'Glu', bp: 396, cutSite: 'EcoRI (G↓AATTC)' },
  { codon: 'TTC', comp: 'AAG', aa: 'Phe', bp: 399 },
  { codon: 'GAG', comp: 'CTC', aa: 'Glu', bp: 402, cutSite: 'SacI (GAGCT↓C)' },
  { codon: 'CTC', comp: 'GAG', aa: 'Leu', bp: 405 },
  { codon: 'GGT', comp: 'CCA', aa: 'Gly', bp: 408, cutSite: 'KpnI (GGTAC↓C)' },
  { codon: 'ACC', comp: 'TGG', aa: 'Thr', bp: 411 },
  { codon: 'CGG', comp: 'GCC', aa: 'Arg', bp: 414 },
  { codon: 'GGA', comp: 'CCT', aa: 'Gly', bp: 417 },
  { codon: 'TCC', comp: 'AGG', aa: 'Ser', bp: 420, cutSite: 'BamHI (G↓GATCC)' },
  { codon: 'TCT', comp: 'AGA', aa: 'Ser', bp: 423 },
  { codon: 'AGA', comp: 'TCT', aa: 'Arg', bp: 426, cutSite: 'XbaI (T↓CTAGA)' },
  { codon: 'GTC', comp: 'CAG', aa: 'Val', bp: 429, cutSite: 'SalI (G↓TCGAC)' },
  { codon: 'GAC', comp: 'CTG', aa: 'Asp', bp: 432 },
  { codon: 'CTG', comp: 'GAC', aa: 'Leu', bp: 435 },
  { codon: 'CAG', comp: 'GTC', aa: 'Gln', bp: 438, cutSite: 'PstI (CTGCA↓G)' },
  { codon: 'GCA', comp: 'CGT', aa: 'Ala', bp: 441 },
  { codon: 'TGC', comp: 'ACG', aa: 'Cys', bp: 444, cutSite: 'SphI (GCATG↓C)' },
  { codon: 'AAG', comp: 'TTC', aa: 'Lys', bp: 447, cutSite: 'HindIII (A↓AGCTT)' },
  { codon: 'CTT', comp: 'GAA', aa: 'Leu', bp: 450 },
];

const AMPR_TRIPLETS: NucleotideTriplet[] = [
  { codon: 'ATG', comp: 'TAC', aa: 'Met', bp: 162 },
  { codon: 'AGT', comp: 'TCA', aa: 'Ser', bp: 165 },
  { codon: 'ATT', comp: 'TAA', aa: 'Ile', bp: 168 },
  { codon: 'CAA', comp: 'GTT', aa: 'Gln', bp: 171 },
  { codon: 'CAT', comp: 'GTA', aa: 'His', bp: 174 },
  { codon: 'TTC', comp: 'AAG', aa: 'Phe', bp: 177 },
  { codon: 'CGT', comp: 'GCA', aa: 'Arg', bp: 180 },
  { codon: 'GTC', comp: 'CAG', aa: 'Val', bp: 183 },
  { codon: 'GCC', comp: 'CGG', aa: 'Ala', bp: 186 },
  { codon: 'CTT', comp: 'GAA', aa: 'Leu', bp: 189 },
  { codon: 'ATT', comp: 'TAA', aa: 'Ile', bp: 192 },
  { codon: 'CCC', comp: 'GGG', aa: 'Pro', bp: 195 },
  { codon: 'TTT', comp: 'AAA', aa: 'Phe', bp: 198 },
  { codon: 'TTT', comp: 'AAA', aa: 'Phe', bp: 201 },
  { codon: 'GCG', comp: 'CGC', aa: 'Ala', bp: 204 },
  { codon: 'GCA', comp: 'CGT', aa: 'Ala', bp: 207 },
  { codon: 'TTT', comp: 'AAA', aa: 'Phe', bp: 210 },
  { codon: 'TGC', comp: 'ACG', aa: 'Cys', bp: 213 },
  { codon: 'CTT', comp: 'GAA', aa: 'Leu', bp: 216 },
];

export function HeroSequenceStrip({ selectedLocus, className = '' }: HeroSequenceStripProps) {
  const triplets = useMemo(() => {
    if (selectedLocus.id === 'locus-ampr') return AMPR_TRIPLETS;
    return MCS_TRIPLETS;
  }, [selectedLocus.id]);

  return (
    <div className={`w-full ${className}`}>
      {/* Top synchronization connection indicator */}
      <div className="flex items-center justify-between font-mono text-[11px] text-[var(--text-muted)] pb-2 mb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-xs" style={{ backgroundColor: selectedLocus.color }} />
          <span className="text-[var(--text)] font-semibold">
            {selectedLocus.name}
          </span>
          <span className="text-[var(--text-muted)]">
            [{selectedLocus.start0 + 1}..{selectedLocus.end0Exclusive} bp · {selectedLocus.end0Exclusive - selectedLocus.start0} bp]
          </span>
        </div>
        <span className="text-[var(--accent)] font-medium">
          SYNCHRONIZED SEQUENCE
        </span>
      </div>

      {/* Monospace sequence virtualization track */}
      <div className="relative overflow-x-auto whitespace-nowrap p-3 border border-[var(--border)] rounded bg-[var(--panel)] scrollbar-none font-mono text-[11px]">
        {/* Cleavage markers track */}
        <div className="flex gap-2.5 h-4 mb-1">
          {triplets.map((t, idx) => (
            <div key={`cut-${idx}`} className="w-10 text-center shrink-0">
              {t.cutSite && (
                <span
                  title={t.cutSite}
                  className="inline-flex items-center gap-0.5 text-[9px] text-[var(--accent)] font-bold"
                >
                  <Scissors size={9} />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 5' to 3' Sense strand */}
        <div className="flex gap-2.5 items-center">
          <span className="text-[10px] text-[var(--text-muted)] w-8 shrink-0 select-none">
            5&apos;→
          </span>
          {triplets.map((t, idx) => (
            <div
              key={`sense-${idx}`}
              className={`w-10 text-center py-0.5 rounded shrink-0 font-bold tracking-wider text-[12px] transition-colors ${
                t.cutSite
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text)]'
              }`}
            >
              {t.codon}
            </div>
          ))}
          <span className="text-[10px] text-[var(--text-muted)] shrink-0 select-none">
            →3&apos;
          </span>
        </div>

        {/* 3' to 5' Antisense strand */}
        <div className="flex gap-2.5 items-center mt-1">
          <span className="text-[10px] text-[var(--text-muted)] w-8 shrink-0 select-none">
            3&apos;←
          </span>
          {triplets.map((t, idx) => (
            <div
              key={`comp-${idx}`}
              className="w-10 text-center py-0.5 shrink-0 text-[11px] text-[var(--text-muted)] font-medium tracking-wider"
            >
              {t.comp}
            </div>
          ))}
          <span className="text-[10px] text-[var(--text-muted)] shrink-0 select-none">
            ←5&apos;
          </span>
        </div>

        {/* Amino acid translation frame */}
        <div className="flex gap-2.5 items-center mt-1.5 pt-1.5 border-t border-[var(--border)]/50">
          <span className="text-[9px] text-[var(--text-muted)] w-8 shrink-0 select-none uppercase">
            AA:
          </span>
          {triplets.map((t, idx) => (
            <div
              key={`aa-${idx}`}
              className="w-10 text-center shrink-0 text-[10px] text-[var(--text-secondary)] font-medium"
            >
              {t.aa}
            </div>
          ))}
        </div>
      </div>

      {/* Coordinate ruler and context notes */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] mt-2 px-1">
        <span>Frame +1 · Canonical 1-based biological coordinates</span>
        <span>Click any locus on the map to navigate loci</span>
      </div>
    </div>
  );
}
