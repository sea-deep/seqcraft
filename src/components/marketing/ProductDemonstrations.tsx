import { useState, useMemo } from 'react';
import {
  Scissors,
  CheckCircle2,
  Lock,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { useWebMCPToolCount } from '../../webmcp/use-webmcp-status';

interface DigestFragment {
  name: string;
  length: string;
  ends: string;
  directional: boolean;
}

export function ProductDemonstrations() {
  const toolCount = useWebMCPToolCount();

  return (
    <div id="product-demonstrations" className="w-full scroll-mt-16 bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent)] selection:text-[var(--accent-foreground)]">
      {/* Demonstration 1: Restriction Digest Engine */}
      <section className="border-t border-[var(--border)] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-16 items-center">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)] mb-4 font-semibold">
              01 // RESTRICTION DIGESTION
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text)] text-balance">
              Simulate enzymatic cuts before ordering oligo stock.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-[var(--text-secondary)]">
              Select enzymes from a catalog of 160+ restriction endonucleases. Cleavage positions,
              sticky 5&apos;/3&apos; overhangs, and resulting fragment lengths are calculated
              deterministically in local memory.
            </p>
          </div>

          <DigestDemonstrator />
        </div>
      </section>

      {/* Demonstration 2: Primer Binding & PCR Simulation */}
      <section className="border-t border-[var(--border)] py-20 lg:py-28 bg-[var(--panel)]">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center">
          <PcrDemonstrator />

          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)] mb-4 font-semibold">
              02 // PCR SIMULATION
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text)] text-balance">
              Thermodynamic primer design with single-base accuracy.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-[var(--text-secondary)]">
              Simulate PCR amplicons across circular and linear topologies. Verify duplex melting
              temperatures, directional orientation, and non-specific binding sites before PCR
              amplification.
            </p>
          </div>
        </div>
      </section>

      {/* Demonstration 3: Agent Staging with Human Approval */}
      <section className="border-t border-[var(--border)] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-16 items-center">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)] mb-4 font-semibold flex items-center gap-1.5">
              <Sparkles size={14} />
              03 // WEBMCP AGENT STAGING
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text)] text-balance">
              An agent that proposes edits and waits for your approval.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-[var(--text-secondary)]">
              SeqCraft exposes {toolCount} biological tools directly to AI models via WebMCP. Instead of
              silently mutating your plasmid, changes are staged for review: coordinate shifts,
              junction scar checks, and feature splits are fully auditable.
            </p>
          </div>

          <AgentStagingDemonstrator />
        </div>
      </section>

      {/* Demonstration 4: Privacy & OPFS Local Execution */}
      <section className="border-t border-[var(--border)] py-20 lg:py-28 bg-[var(--panel)]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[var(--border)] bg-[var(--bg)] font-mono text-[11px] uppercase tracking-wider text-[var(--success)] mb-5">
            <Lock size={12} />
            Private by Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text)] text-balance">
            Your sequences stay on your computer.
          </h2>
          <p className="mt-5 text-[16px] sm:text-[17px] leading-7 text-[var(--text-secondary)] max-w-2xl mx-auto">
            Raw sequences are parsed in background web workers and stored in your browser&apos;s
            Origin Private File System (OPFS). No sequences ever touch cloud servers or LLM training
            corpora.
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-4 text-left font-mono text-[12px]">
            <div className="p-4 border border-[var(--border)] rounded bg-[var(--bg)]">
              <div className="text-[var(--accent)] font-bold text-[18px] mb-1">0 bytes</div>
              <div className="text-[var(--text)] font-semibold mb-1">Network Uploads</div>
              <div className="text-[var(--text-muted)] text-[11px] leading-5">
                FASTA and GenBank parsing runs entirely inside your browser.
              </div>
            </div>
            <div className="p-4 border border-[var(--border)] rounded bg-[var(--bg)]">
              <div className="text-[var(--accent)] font-bold text-[18px] mb-1">Local Storage</div>
              <div className="text-[var(--text)] font-semibold mb-1">Browser Filesystem</div>
              <div className="text-[var(--text-muted)] text-[11px] leading-5">
                Sequences save directly to your browser without cloud storage limits.
              </div>
            </div>
            <div className="p-4 border border-[var(--border)] rounded bg-[var(--bg)]">
              <div className="text-[var(--accent)] font-bold text-[18px] mb-1">Scoped Access</div>
              <div className="text-[var(--text)] font-semibold mb-1">Local Agent Runs</div>
              <div className="text-[var(--text-muted)] text-[11px] leading-5">
                Agents only see the exact regions and coordinates you select.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------------------------------------
// Demo 1: Restriction Digest Simulator
// --------------------------------------------------------------------------------
function DigestDemonstrator() {
  const [useEcoRI, setUseEcoRI] = useState(true);
  const [useHindIII, setUseHindIII] = useState(true);

  const fragments = useMemo<DigestFragment[]>(() => {
    if (useEcoRI && useHindIII) {
      return [
        { name: 'Vector Backbone', length: '2,630 bp', ends: "5' AATT (EcoRI) / 5' AGCT (HindIII)", directional: true },
        { name: 'Excised Polylinker', length: '56 bp', ends: "5' AGCT / 5' AATT", directional: true },
      ];
    }
    if (useEcoRI || useHindIII) {
      return [{ name: 'Linearized pUC19', length: '2,686 bp', ends: useEcoRI ? "5' AATT cohesive ends" : "5' AGCT cohesive ends", directional: false }];
    }
    return [{ name: 'Intact Circular pUC19', length: '2,686 bp', ends: 'Covalently Closed Circular (cccDNA)', directional: false }];
  }, [useEcoRI, useHindIII]);

  return (
    <div className="border border-[var(--border)] rounded-md bg-[var(--panel)] p-5 font-mono text-[12px]">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Scissors size={14} className="text-[var(--accent)]" />
          <span className="font-semibold text-[var(--text)]">RESTRICTION ENGINE // pUC19</span>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">CIRCULAR dsDNA</span>
      </div>

      {/* Enzyme Selectors */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setUseEcoRI(v => !v)}
          className={`px-3 py-1.5 rounded border text-[11px] font-semibold cursor-pointer transition-colors ${
            useEcoRI
              ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--panel-muted)]'
          }`}
        >
          EcoRI · G↓AATTC (396 bp)
        </button>
        <button
          type="button"
          onClick={() => setUseHindIII(v => !v)}
          className={`px-3 py-1.5 rounded border text-[11px] font-semibold cursor-pointer transition-colors ${
            useHindIII
              ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--panel-muted)]'
          }`}
        >
          HindIII · A↓AGCTT (452 bp)
        </button>
      </div>

      {/* Results Table */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">
          SIMULATED DIGEST RESULTS ({fragments.length} FRAGMENT{fragments.length > 1 ? 'S' : ''})
        </div>
        {fragments.map((frag, idx) => (
          <div key={idx} className="p-3 border border-[var(--border)] rounded bg-[var(--bg)] flex items-center justify-between">
            <div>
              <div className="text-[var(--text)] font-semibold">{frag.name}</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{frag.ends}</div>
            </div>
            <div className="text-right">
              <div className="text-[var(--accent)] font-bold text-[14px]">{frag.length}</div>
              {frag.directional && (
                <span className="text-[10px] text-[var(--success)] font-semibold">DIRECTIONAL READY</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// Demo 2: PCR Simulation Demonstrator
// --------------------------------------------------------------------------------
function PcrDemonstrator() {
  return (
    <div className="border border-[var(--border)] rounded-md bg-[var(--bg)] p-5 font-mono text-[12px]">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
        <span className="font-semibold text-[var(--text)]">PCR ASSAY // M13 INSERT AMPLIFICATION</span>
        <span className="text-[11px] text-[var(--success)] flex items-center gap-1">
          <CheckCircle2 size={12} />
          DUAL-END BINDING
        </span>
      </div>

      <div className="space-y-3">
        <div className="p-3 border border-[var(--border)] rounded bg-[var(--panel)]">
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--accent)] font-semibold">FORWARD: M13 (-20)</span>
            <span className="text-[var(--text-muted)]">Tm: 58.4°C · 17 nt</span>
          </div>
          <div className="mt-1 text-[var(--text)] font-bold tracking-wider">
            5&apos;-GTAAAACGACGGCCAGT-3&apos;
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">
            Binds: 379..395 bp (Sense strand)
          </div>
        </div>

        <div className="p-3 border border-[var(--border)] rounded bg-[var(--panel)]">
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--bio-cds)] font-semibold">REVERSE: M13 (-24)</span>
            <span className="text-[var(--text-muted)]">Tm: 54.2°C · 16 nt</span>
          </div>
          <div className="mt-1 text-[var(--text)] font-bold tracking-wider">
            5&apos;-AACAGCTATGACCATG-3&apos;
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">
            Binds: 547..562 bp (Antisense strand)
          </div>
        </div>

        <div className="p-3 border border-[var(--border-strong)] rounded bg-[var(--accent-soft)]/20 text-[var(--text)] flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold">
              CALCULATED AMPLICON
            </div>
            <div className="font-bold text-[14px]">184 bp target product</div>
          </div>
          <span className="px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-foreground)] text-[10px] font-bold">
            NO OFF-TARGETS
          </span>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// Demo 3: Agent Staging & Human Approval Demonstrator
// --------------------------------------------------------------------------------
function AgentStagingDemonstrator() {
  const [approved, setApproved] = useState<boolean | null>(null);

  return (
    <div className="border border-[var(--border-strong)] rounded-md bg-[var(--panel)] p-5 font-mono text-[12px]">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[var(--warning)] animate-pulse" />
          <span className="font-semibold text-[var(--text)]">STAGED AGENT PROPOSAL</span>
        </div>
        <span className="text-[10px] text-[var(--warning)] font-semibold uppercase">
          Awaiting Review
        </span>
      </div>

      <div className="p-3.5 border border-[var(--border)] rounded bg-[var(--bg)] space-y-2 mb-4">
        <div className="text-[var(--text-muted)] text-[11px]">
          $ seqcraft_prepare_restriction_clone()
        </div>
        <div className="text-[var(--text)] font-semibold">
          Insert GFP Reporter (720 bp) into pUC19
        </div>
        <div className="text-[11px] text-[var(--text-secondary)] space-y-1 pt-1 border-t border-[var(--border)]/60">
          <div>Target locus: EcoRI (396 bp) to HindIII (452 bp)</div>
          <div>Excised segment: 56 bp multiple cloning site</div>
          <div>Net vector change: +664 bp (Recombinant: 3,350 bp)</div>
          <div className="text-[var(--success)] font-semibold">
            ✓ Downstream features (lacZ, ori, AmpR) shift +664 bp correctly
          </div>
        </div>
      </div>

      {approved === null ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setApproved(true)}
            className="flex-1 h-9 rounded bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold text-[12px] flex items-center justify-center gap-1.5 hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
          >
            <Check size={14} /> Approve & Apply Mutation
          </button>
          <button
            type="button"
            onClick={() => setApproved(false)}
            className="px-4 h-9 rounded border border-[var(--border)] bg-[var(--panel)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--panel-muted)] transition-colors cursor-pointer"
          >
            <X size={14} /> Reject
          </button>
        </div>
      ) : approved ? (
        <div className="p-2.5 rounded bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] font-semibold text-center flex items-center justify-center gap-2">
          <Check size={15} /> Mutation applied to local workspace. Coordinates updated.
        </div>
      ) : (
        <div className="p-2.5 rounded bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] font-semibold text-center flex items-center justify-center gap-2">
          <X size={15} /> Proposal rejected. Workspace remains unchanged.
        </div>
      )}
    </div>
  );
}
