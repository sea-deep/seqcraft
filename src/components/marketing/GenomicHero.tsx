import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import { HeroPlasmidMap, PUC19_LOCI, type PlasmidLocus } from './HeroPlasmidMap';
import { HeroSequenceStrip } from './HeroSequenceStrip';

export function GenomicHero() {
  const [selectedLocus, setSelectedLocus] = useState<PlasmidLocus>(PUC19_LOCI[4]); // default to MCS

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent)] selection:text-[var(--accent-foreground)]">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Focused Editorial Typography & Actions */}
          <div className="min-w-0">
            {/* 1 Strong Headline */}
            <h1 className="text-[clamp(2.5rem,4.2vw,3.75rem)] font-bold tracking-[-0.04em] leading-[1.08] text-balance text-[var(--text)]">
              Design DNA without losing sight of a single base.
            </h1>

            {/* 1 Short Supporting Paragraph (~5 second read) */}
            <p className="mt-5 text-[16px] sm:text-[17px] leading-7 text-[var(--text-secondary)] text-balance max-w-lg">
              Inspect circular plasmids, simulate restriction cuts and PCR, and verify edits down to
              individual nucleotides—all in your browser, with raw sequences kept entirely local.
            </p>

            {/* 2 Actions Maximum */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/dashboard"
                className="h-11 inline-flex items-center gap-2 px-6 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] text-[14px] font-semibold hover:bg-[var(--accent-hover)] transition-colors cursor-pointer shadow-xs"
              >
                Launch SeqCraft <ArrowRight size={16} />
              </Link>
              <Link
                to="/dashboard"
                className="h-11 inline-flex items-center gap-2 px-5 rounded-md border border-[var(--border)] bg-[var(--panel)] text-[14px] font-medium text-[var(--text)] hover:bg-[var(--panel-muted)] transition-colors cursor-pointer"
              >
                <Compass size={16} className="text-[var(--accent)]" /> Open pUC19 demo
              </Link>
            </div>

            {/* Quiet, factual note */}
            <div className="mt-7 font-mono text-[11px] text-[var(--text-muted)]">
              Local OPFS storage · Standard 1-based biological coordinates · 24 WebMCP tools
            </div>
          </div>

          {/* Right Column: Dominant Product Visualization (Large Plasmid + Synchronized Sequence) */}
          <div className="w-full min-w-0 flex flex-col items-center">
            {/* Large Circular Plasmid Map */}
            <HeroPlasmidMap
              selectedLocusId={selectedLocus.id}
              onSelectLocus={setSelectedLocus}
              className="w-full"
            />

            {/* Visual connector lines from plasmid selection down to sequence strip */}
            <div className="w-full max-w-md h-4 flex justify-between px-8 text-[var(--border-strong)] opacity-60">
              <span className="border-l border-b border-[var(--border-strong)] w-8 h-full" />
              <span className="border-r border-b border-[var(--border-strong)] w-8 h-full" />
            </div>

            {/* Synchronized Linear Sequence Strip */}
            <HeroSequenceStrip
              selectedLocus={selectedLocus}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
