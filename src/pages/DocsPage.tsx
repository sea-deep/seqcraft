import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileUp,
  TestTube,
  Cpu,
  ArrowLeft,
  Layers,
  Code2,
  ExternalLink,
  Shield,
  Dna,
  Binary,
  Workflow,
  Copy,
  Check,
} from 'lucide-react';
import { SeqCraftLogo } from '../components/ui/SeqCraftLogo';
import { AccountMenu } from '../components/account/AccountMenu';
import { useAuthenticatedUser } from '../platform/use-authenticated-user';

export function DocsPage() {
  const auth = useAuthenticatedUser();
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans flex flex-col selection:bg-[var(--accent)] selection:text-[var(--accent-foreground)]">
      {/* Header Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-[var(--accent)] flex items-center justify-center">
            <SeqCraftLogo size={20} />
          </div>
          <div>
            <span className="font-semibold text-[16px] tracking-tight">SeqCraft Technical Manual</span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-mono text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded">
              v2.1 · Architecture & Algorithms
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-[13px] font-medium flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft size={16} /> Open Workspace
          </Link>
          {auth.user ? (
            <AccountMenu user={auth.user} />
          ) : auth.status === 'checking' ? (
            <div
              className="size-8 animate-pulse rounded-full border border-[var(--border)] bg-[var(--panel-muted)]"
              aria-label="Checking account"
            />
          ) : null}
        </div>
      </nav>

      {/* Main Documentation Container */}
      <div className="max-w-7xl mx-auto w-full px-6 py-10 grid lg:grid-cols-[240px_1fr] gap-12">
        {/* Sticky Table of Contents Navigation */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6 text-[13px]">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-semibold">
              Specification Index
            </div>
            <nav className="space-y-2 border-l border-[var(--border)] pl-3 text-[var(--text-secondary)] font-medium">
              <a href="#coordinates" className="block hover:text-[var(--accent)] transition-colors">
                1. Coordinates & Topology
              </a>
              <a href="#enzymology" className="block hover:text-[var(--accent)] transition-colors">
                2. Computational Enzymology
              </a>
              <a href="#thermodynamics" className="block hover:text-[var(--accent)] transition-colors">
                3. Thermodynamics & PCR
              </a>
              <a href="#translation" className="block hover:text-[var(--accent)] transition-colors">
                4. Translation & ORFs
              </a>
              <a href="#next-gen" className="block hover:text-[var(--accent)] transition-colors">
                5. Assembly & CRISPR Engines
              </a>
              <a href="#storage" className="block hover:text-[var(--accent)] transition-colors">
                6. Storage & Virtualization
              </a>
              <a href="#webmcp" className="block hover:text-[var(--accent)] transition-colors">
                7. WebMCP Protocol Interface
              </a>
              <a href="#api" className="block hover:text-[var(--accent)] transition-colors">
                8. Programmatic API
              </a>
            </nav>

            <div className="p-3.5 border border-[var(--border)] rounded-md bg-[var(--panel)] font-mono text-[11px] space-y-1.5 text-[var(--text-muted)]">
              <div className="text-[var(--text)] font-semibold">Computational Guarantees</div>
              <div>• 0-based half-open core</div>
              <div>• 100% client OPFS sandbox</div>
              <div>• 24 declared WebMCP tools</div>
              <div>• Zero cloud sequence ingress</div>
            </div>
          </div>
        </aside>

        {/* Content Stream */}
        <main className="min-w-0 space-y-16 pb-24 text-[15px] leading-7 text-[var(--text-secondary)]">
          {/* Header */}
          <header className="border-b border-[var(--border)] pb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text)] mb-3">
              System Architecture & Scientific Specifications
            </h1>
            <p className="text-[16px] text-[var(--text-secondary)] max-w-3xl leading-relaxed">
              Technical documentation for computational biologists and software engineers. Details internal
              coordinate contracts, biophysical algorithms, multi-fragment assembly graph solvers, and
              the Model Context Protocol interface.
            </p>
          </header>

          {/* Section 1: Coordinates & Circular Topology */}
          <section id="coordinates" className="scroll-mt-24 space-y-5">
            <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-[12px] uppercase tracking-wider font-semibold">
              <Binary size={16} /> Section 01
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">
              1. Coordinate Space & Circular Topology Invariants
            </h2>
            <p>
              SeqCraft separates internal algebraic representations from biological human/agent interfaces.
              Coordinates within core calculations are strictly 0-based half-open, while all visual
              renderings and WebMCP tool invocations operate on standard 1-based biological intervals.
            </p>

            <div className="grid md:grid-cols-2 gap-4 my-4 font-mono text-[12px]">
              <div className="p-4 border border-[var(--border)] rounded-md bg-[var(--panel)] space-y-1.5">
                <div className="text-[var(--text)] font-bold">Internal Engine Representation</div>
                <div className="text-[var(--accent)]">[start0, end0Exclusive)</div>
                <div className="text-[var(--text-muted)] text-[11px] leading-5">
                  Interval spans indices where start0 is inclusive and end0Exclusive is exclusive.
                  Segment length is exactly (end0Exclusive - start0).
                </div>
              </div>
              <div className="p-4 border border-[var(--border)] rounded-md bg-[var(--panel)] space-y-1.5">
                <div className="text-[var(--text)] font-bold">Biological UI & WebMCP Boundary</div>
                <div className="text-[var(--accent)]">[start1, end1Inclusive]</div>
                <div className="text-[var(--text-muted)] text-[11px] leading-5">
                  1-based inclusive indices. Conversion invariant: start0 = start1 - 1, and end0Exclusive = end1Inclusive.
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text)] pt-2">Origin-Spanning Intervals (Circular Boundary)</h3>
            <p>
              Plasmids and circular DNA molecules wrap at position <code className="font-mono text-[13px] text-[var(--accent)]">L</code> (total sequence length).
              When an annotated feature or selection spans the origin (<code className="font-mono text-[13px]">start0 &gt; end0Exclusive</code>),
              SeqCraft partitions the interval into two contiguous linear segments:
            </p>
            <div className="p-4 border border-[var(--border)] rounded-md bg-[var(--panel-muted)] font-mono text-[12px] text-[var(--text)] overflow-x-auto">
              Segment 1: [start0, L)  // Locus from start coordinate up to the circular boundary<br />
              Segment 2: [0, end0Exclusive) // Locus continuing from nucleotide 0 onward<br />
              Total Spanning Length = (L - start0) + end0Exclusive
            </div>

            <h3 className="text-lg font-semibold text-[var(--text)] pt-2">In-Place Mutation Arithmetic</h3>
            <p>
              When an in-place sequence modification occurs (insertion, deletion, replacement, or origin rotation),
              all existing biological features (CDS, promoters, origins, terminators) are transformed deterministically:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[14px]">
              <li><strong>Downstream Shift:</strong> Features positioned entirely downstream of an insertion locus shift by +ΔL.</li>
              <li><strong>Upstream Invariance:</strong> Features positioned entirely upstream remain unchanged.</li>
              <li><strong>Spanning Expansion:</strong> Features enclosing an insertion locus expand their interval by +ΔL.</li>
              <li><strong>Clipped Deletions:</strong> Features partially overlapping a deletion have their overlapping interval clipped. Features fully engulfed by a deletion are purged.</li>
              <li><strong>Origin Re-indexing:</strong> Rotating a plasmid origin to coordinate <code className="font-mono text-[12px]">k</code> transforms each base index via <code className="font-mono text-[12px]">x' = (x - k) mod L</code>, re-partitioning any feature that crosses the new index boundary.</li>
            </ul>
          </section>

          {/* Section 2: Computational Enzymology */}
          <section id="enzymology" className="scroll-mt-24 space-y-5 border-t border-[var(--border)] pt-12">
            <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-[12px] uppercase tracking-wider font-semibold">
              <TestTube size={16} /> Section 02
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">
              2. Computational Enzymology & Cloning Mechanics
            </h2>
            <p>
              Restriction digest simulations evaluate exact recognition sequences across both linear and circular
              topologies, accounting for degenerate IUPAC nucleotide definitions without lossy regular expression conversions.
            </p>

            <div className="overflow-x-auto border border-[var(--border)] rounded-md">
              <table className="w-full text-left font-mono text-[12px]">
                <thead className="bg-[var(--panel-muted)] text-[var(--text)] border-b border-[var(--border)]">
                  <tr>
                    <th className="p-3">Enzyme</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Recognition Site</th>
                    <th className="p-3">Cut Offset (Sense / Antisense)</th>
                    <th className="p-3">Overhang Terminus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--panel)]">
                  <tr>
                    <td className="p-3 font-semibold text-[var(--accent)]">EcoRI</td>
                    <td className="p-3">Type II</td>
                    <td className="p-3">5&apos;-G^AATTC-3&apos;</td>
                    <td className="p-3">+1 / +5</td>
                    <td className="p-3 text-[var(--success)]">5&apos; Cohesive (AATT)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[var(--accent)]">BamHI</td>
                    <td className="p-3">Type II</td>
                    <td className="p-3">5&apos;-G^GATCC-3&apos;</td>
                    <td className="p-3">+1 / +5</td>
                    <td className="p-3 text-[var(--success)]">5&apos; Cohesive (GATC)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[var(--accent)]">HindIII</td>
                    <td className="p-3">Type II</td>
                    <td className="p-3">5&apos;-A^AGCTT-3&apos;</td>
                    <td className="p-3">+1 / +5</td>
                    <td className="p-3 text-[var(--success)]">5&apos; Cohesive (AGCT)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[var(--accent)]">PstI</td>
                    <td className="p-3">Type II</td>
                    <td className="p-3">5&apos;-CTGCA^G-3&apos;</td>
                    <td className="p-3">+5 / +1</td>
                    <td className="p-3 text-[var(--warning)]">3&apos; Cohesive (TGCA)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[var(--accent)]">EcoRV</td>
                    <td className="p-3">Type II</td>
                    <td className="p-3">5&apos;-GAT^ATC-3&apos;</td>
                    <td className="p-3">+3 / +3</td>
                    <td className="p-3 text-[var(--text-muted)]">Blunt</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[var(--accent)]">BsaI</td>
                    <td className="p-3">Type IIS</td>
                    <td className="p-3">5&apos;-GGTCTC(N1/N5)-3&apos;</td>
                    <td className="p-3">+7 / +11 (shifted 1/5 bp)</td>
                    <td className="p-3 text-[var(--bio-promoter)]">5&apos; Cohesive (4nt variable)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text)] pt-2">Ligation Compatibility Invariants</h3>
            <p>
              In silico cloning planners require pairwise end compatibility before simulating recombinant constructs.
              Two cohesive ends are ligatable if and only if their single-stranded overhangs are complementary in 5&apos;→3&apos; orientation:
            </p>
            <div className="p-4 border border-[var(--border)] rounded-md bg-[var(--panel-muted)] font-mono text-[12px] text-[var(--text)]">
              Overhang_Insert_5&apos; ≡ Complement(Overhang_Vector_3&apos;) ∧ Overhang_Insert_3&apos; ≡ Complement(Overhang_Vector_5&apos;)
            </div>
            <p className="text-[13px] text-[var(--text-muted)]">
              Directional cloning using two distinct enzymes (e.g., EcoRI + HindIII) guarantees single-orientation
              ligation and prevents vector self-circularization.
            </p>
          </section>

          {/* Section 3: Thermodynamics & PCR */}
          <section id="thermodynamics" className="scroll-mt-24 space-y-5 border-t border-[var(--border)] pt-12">
            <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-[12px] uppercase tracking-wider font-semibold">
              <Dna size={16} /> Section 03
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">
              3. Biophysical Thermodynamics & PCR Simulation
            </h2>
            <p>
              Melting temperature calculations (<code className="font-mono text-[13px]">Tm</code>) implement the
              SantaLucia (1998) unified nearest-neighbor thermodynamic parameters.
            </p>

            <div className="p-4 border border-[var(--border)] rounded-md bg-[var(--panel)] font-mono text-[12px] space-y-2">
              <div className="text-[var(--text)] font-semibold">Nearest-Neighbor Tm Formulation:</div>
              <div className="text-[var(--accent)]">
                Tm = (ΔH° / (ΔS° + R · ln(Ct / 4))) - 273.15 + 16.6 · log10([Na+])
              </div>
              <div className="text-[var(--text-muted)] text-[11px] leading-5">
                Where ΔH° is enthalpy (kcal/mol), ΔS° is entropy (cal/mol·K), R is the gas constant (1.9872 cal/mol·K),
                Ct is total primer concentration (default: 250 nM), and [Na+] is monovalent cation concentration (default: 50 mM).
              </div>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text)] pt-2">Amplicon Prediction Mechanics</h3>
            <p>
              Simulating PCR evaluates exact 3&apos;-end primer hybridization:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[14px]">
              <li><strong>Forward Primer:</strong> Must anneal to the antisense strand, extending in the 5&apos;→3&apos; direction along increasing coordinate values.</li>
              <li><strong>Reverse Primer:</strong> Must anneal to the sense strand, extending in the 5&apos;→3&apos; direction along decreasing coordinate values.</li>
              <li><strong>Linear Molecules:</strong> Amplicon length = End_Rev - Start_Fwd. Negative spans or non-convergent primer vectors produce 0 amplicons.</li>
              <li><strong>Circular Molecules:</strong> Primers facing outward across the origin boundary produce valid wrap-around amplicons: <code className="font-mono text-[12px]">(L - Start_Fwd) + End_Rev</code>.</li>
            </ul>
          </section>

          {/* Section 4: Translation & ORFs */}
          <section id="translation" className="scroll-mt-24 space-y-5 border-t border-[var(--border)] pt-12">
            <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-[12px] uppercase tracking-wider font-semibold">
              <Layers size={16} /> Section 04
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">
              4. Genetic Code Translation & ORF Discovery
            </h2>
            <p>
              Sequences are translated in all six reading frames according to the Standard Genetic Code (NCBI Translation Table 1).
              Open reading frames (ORFs) are identified by locating canonical initiation codons (<code className="font-mono text-[12px]">ATG</code>)
              and terminating at in-frame stop codons (<code className="font-mono text-[12px]">TAA, TAG, TGA</code>).
            </p>

            <div className="grid md:grid-cols-2 gap-4 font-mono text-[12px]">
              <div className="p-4 border border-[var(--border)] rounded-md bg-[var(--panel)] space-y-1">
                <div className="text-[var(--text)] font-semibold">Sense Strand Reading Frames</div>
                <div className="text-[var(--accent)]">+1: offset 0, 3, 6, ...</div>
                <div className="text-[var(--accent)]">+2: offset 1, 4, 7, ...</div>
                <div className="text-[var(--accent)]">+3: offset 2, 5, 8, ...</div>
              </div>
              <div className="p-4 border border-[var(--border)] rounded-md bg-[var(--panel)] space-y-1">
                <div className="text-[var(--text)] font-semibold">Antisense Reading Frames (RevComp)</div>
                <div className="text-[var(--bio-cds)]">-1: offset 0, 3, 6, ... (from 3&apos;)</div>
                <div className="text-[var(--bio-cds)]">-2: offset 1, 4, 7, ... (from 3&apos;)</div>
                <div className="text-[var(--bio-cds)]">-3: offset 2, 5, 8, ... (from 3&apos;)</div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text)] pt-2">Codon Mutation Impact Classification</h3>
            <p>
              When mutations are introduced into coding regions (CDS features), SeqCraft classifies the biological consequence:
            </p>
            <div className="grid sm:grid-cols-4 gap-3 font-mono text-[11px]">
              <div className="p-3 border border-[var(--border)] rounded bg-[var(--panel)]">
                <div className="text-[var(--text)] font-bold mb-1">Silent</div>
                <div className="text-[var(--text-muted)]">Synonymous codon; amino acid translation invariant.</div>
              </div>
              <div className="p-3 border border-[var(--border)] rounded bg-[var(--panel)]">
                <div className="text-[var(--warning)] font-bold mb-1">Missense</div>
                <div className="text-[var(--text-muted)]">Alters single amino acid residue.</div>
              </div>
              <div className="p-3 border border-[var(--border)] rounded bg-[var(--panel)]">
                <div className="text-[var(--danger)] font-bold mb-1">Nonsense</div>
                <div className="text-[var(--text-muted)]">Introduces premature termination codon (*).</div>
              </div>
              <div className="p-3 border border-[var(--border)] rounded bg-[var(--panel)]">
                <div className="text-[var(--bio-misc)] font-bold mb-1">Frameshift</div>
                <div className="text-[var(--text-muted)]">Indel length not divisible by 3 (ΔL mod 3 ≠ 0).</div>
              </div>
            </div>
          </section>

          {/* Section 5: Assembly & CRISPR Engines */}
          <section id="next-gen" className="scroll-mt-24 space-y-5 border-t border-[var(--border)] pt-12">
            <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-[12px] uppercase tracking-wider font-semibold">
              <Workflow size={16} /> Section 05
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">
              5. Next-Gen Assembly, CRISPR & Robotics Engines
            </h2>

            {/* CRISPR */}
            <div className="p-5 border border-[var(--border)] rounded-md bg-[var(--panel)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--accent)]" /> SpCas9 Guide Radar & MMEJ Forecaster
                </h3>
                <span className="font-mono text-[11px] text-[var(--accent)]">5&apos;-NGG-3&apos; PAM</span>
              </div>
              <p className="text-[14px]">
                Scans sense and antisense strands for SpCas9 protospacer adjacent motifs. Cleavage occurs exactly 3 bp upstream
                of the PAM site. Guides are penalized for poly-T tracts (≥4 Ts trigger RNA Pol III termination) and extreme
                GC skew (optimum: 40%–60%).
              </p>
              <div className="p-3 border border-[var(--border)] rounded bg-[var(--bg)] font-mono text-[11px] text-[var(--text-muted)]">
                Microhomology-Mediated End Joining (MMEJ) repair pattern forecasting detects flanking tandem repeats
                (2–8 bp) around the double-strand break to estimate out-of-frame knockout probability prior to synthesis.
              </div>
            </div>

            {/* Golden Gate */}
            <div className="p-5 border border-[var(--border)] rounded-md bg-[var(--panel)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--bio-promoter)]" /> Type IIS Golden Gate Assembly & Domestication
                </h3>
                <span className="font-mono text-[11px] text-[var(--bio-promoter)]">BsaI / BsmBI / PaqCI</span>
              </div>
              <p className="text-[14px]">
                Simulates scarless multi-part assembly. Evaluates 4nt cohesive overhang junction graphs to verify
                closed circular ligation paths without junction ambiguities or cross-reactivity.
              </p>
              <p className="text-[14px]">
                <strong>Automated Domestication:</strong> When internal restriction recognition sites are detected inside a CDS feature,
                the domesticator calculates synonymous codon substitutions, selecting the highest-frequency synonymous codon to abolish
                the restriction site without altering the translated protein.
              </p>
            </div>

            {/* Opentrons */}
            <div className="p-5 border border-[var(--border)] rounded-md bg-[var(--panel)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--success)]" /> Opentrons Protocol Compiler
                </h3>
                <span className="font-mono text-[11px] text-[var(--success)]">Python API v2.15 (OT-2 / Flex)</span>
              </div>
              <p className="text-[14px]">
                Compiles declarative cloning reactions into executable Python scripts. Computes 10% pipetting dead-volume overages,
                24-tube rack coordinates (<code className="font-mono text-[12px]">opentrons_24_tuberack_generic_2ml_screwcap</code>),
                96-well reaction layouts (<code className="font-mono text-[12px]">nest_96_wellplate_100ul_pcr_full_skirt</code>), and
                thermocycler ramp/elongation timing calculated at 30 s/kb.
              </p>
            </div>

            {/* Biosecurity */}
            <div className="p-5 border border-[var(--border)] rounded-md bg-[var(--panel)] space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
                  <Shield size={16} className="text-[var(--warning)]" /> Local Biosecurity Motif Diagnostic Pre-Screen
                </h3>
                <span className="font-mono text-[11px] text-[var(--warning)]">Diagnostic Lookup Only</span>
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                Executes a client-side k-mer comparison against 17 curated controlled-agent reference examples.
                <strong className="text-[var(--text)]"> Notice:</strong> This tool is an early diagnostic indicator. It does not constitute
                a regulatory compliance determination and does not replace institutional safety review or commercial gene-synthesis provider screening.
              </p>
            </div>
          </section>

          {/* Section 6: Storage & Virtualization */}
          <section id="storage" className="scroll-mt-24 space-y-5 border-t border-[var(--border)] pt-12">
            <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-[12px] uppercase tracking-wider font-semibold">
              <FileUp size={16} /> Section 06
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">
              6. Storage Architecture & Deterministic Virtualization
            </h2>
            <p>
              SeqCraft operates as a <strong>local-first zero-exposure architecture</strong>. Raw nucleotide and amino-acid bytes
              never touch cloud infrastructure.
            </p>

            <div className="p-4 border border-[var(--border)] rounded-md bg-[var(--panel)] space-y-3 text-[13px]">
              <div className="text-[var(--text)] font-semibold">Memory & Storage Hierarchy:</div>
              <div className="grid sm:grid-cols-3 gap-3 font-mono text-[11px]">
                <div className="p-3 border border-[var(--border)] rounded bg-[var(--bg)]">
                  <div className="text-[var(--accent)] font-bold mb-1">In-Memory (RAM)</div>
                  <div>Zustand state store holding active document descriptors and cached slices.</div>
                </div>
                <div className="p-3 border border-[var(--border)] rounded bg-[var(--bg)]">
                  <div className="text-[var(--accent)] font-bold mb-1">OPFS / IndexedDB</div>
                  <div>Origin Private File System chunking for instant retrieval of 100M+ bp sequences.</div>
                </div>
                <div className="p-3 border border-[var(--border)] rounded bg-[var(--bg)]">
                  <div className="text-[var(--accent)] font-bold mb-1">Cloud Sync (Optional)</div>
                  <div>Stores only document headers: ID, name, topology, length, and user ID. Zero nucleotides.</div>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text)] pt-2">Canonical Monospace Virtualization</h3>
            <p>
              Traditional web sequence viewers measure text using DOM elements or Canvas <code className="font-mono text-[12px]">measureText()</code>,
              creating layout thrashing during scroll. SeqCraft maps coordinates to screen pixels using CSS monospace <code className="font-mono text-[12px]">ch</code> units:
            </p>
            <div className="p-4 border border-[var(--border)] rounded-md bg-[var(--panel-muted)] font-mono text-[12px] text-[var(--text)]">
              Screen_Offset(coordinate) = coordinate × 1ch
            </div>
            <p className="text-[13px] text-[var(--text-muted)]">
              Because character metrics in monospace fonts are algebraically invariant, viewport virtualizers compute visible base ranges
              in O(1) time complexity, maintaining stable 60 FPS scrolling on 100,000+ base chromosomes.
            </p>
          </section>

          {/* Section 7: WebMCP Protocol Interface */}
          <section id="webmcp" className="scroll-mt-24 space-y-5 border-t border-[var(--border)] pt-12">
            <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-[12px] uppercase tracking-wider font-semibold">
              <Cpu size={16} /> Section 07
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">
              7. WebMCP Declarative Agent Runtime
            </h2>
            <p>
              SeqCraft implements the Model Context Protocol directly in the browser via <code className="font-mono text-[12px]">window.document.modelContext</code>.
              Autonomous AI agents and browser-integrated models discover and invoke 24 declared biological tools.
            </p>

            <div className="overflow-x-auto border border-[var(--border)] rounded-md font-mono text-[12px]">
              <table className="w-full text-left">
                <thead className="bg-[var(--panel-muted)] text-[var(--text)] border-b border-[var(--border)]">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Example Tool Name</th>
                    <th className="p-3">Side Effect Policy</th>
                    <th className="p-3">Approval Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--panel)]">
                  <tr>
                    <td className="p-3 font-semibold text-[var(--accent)]">Inspection & Analysis</td>
                    <td className="p-3">seqcraft_detect_restriction_sites, seqcraft_find_orfs</td>
                    <td className="p-3 text-[var(--text-muted)]">readOnlyHint: true</td>
                    <td className="p-3 text-[var(--success)]">No (Idempotent)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[var(--accent)]">Viewport Navigation</td>
                    <td className="p-3">seqcraft_focus_region, seqcraft_show_feature</td>
                    <td className="p-3 text-[var(--warning)]">readOnlyHint: false (UI state)</td>
                    <td className="p-3 text-[var(--success)]">No (Non-destructive)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-[var(--accent)]">Sequence Editing & Cloning</td>
                    <td className="p-3">seqcraft_edit_sequence, seqcraft_prepare_restriction_clone</td>
                    <td className="p-3 text-[var(--danger)]">Persistent workspace mutation</td>
                    <td className="p-3 text-[var(--danger)] font-bold">Yes (Human Approval Gate)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text)] pt-2">Human-in-the-Loop (HITL) Proposal Lifecycle</h3>
            <p>
              When an agent calls a mutation tool (<code className="font-mono text-[12px]">seqcraft_prepare_restriction_clone</code> or <code className="font-mono text-[12px]">seqcraft_edit_sequence</code>),
              the sequence is not altered directly. Instead, a staged mutation proposal is registered in the workspace:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-[14px]">
              <li>Tool computes coordinate shifts, overhang matches, and fragment boundaries.</li>
              <li>Generates proposal payload with before/after coordinate arithmetic.</li>
              <li>Displays interactive approval modal in SeqCraft workspace.</li>
              <li>Modification is committed to OPFS storage only upon explicit human confirmation.</li>
            </ol>
          </section>

          {/* Section 8: Programmatic API */}
          <section id="api" className="scroll-mt-24 space-y-5 border-t border-[var(--border)] pt-12">
            <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-[12px] uppercase tracking-wider font-semibold">
              <Code2 size={16} /> Section 08
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">
                8. Programmatic Core API (nucleotide-sequence)
              </h2>
              <a
                href="https://www.npmjs.com/package/nucleotide-sequence"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-mono text-[var(--accent)] hover:underline"
              >
                npm i nucleotide-sequence <ExternalLink size={12} />
              </a>
            </div>
            <p>
              The scientific core is published as an independent, zero-dependency npm library.
              The exact computational methods powering the SeqCraft interface are accessible programmatically:
            </p>

            <div className="relative border border-[var(--border)] rounded-md bg-[var(--panel)] p-4 font-mono text-[12px] text-[var(--text)] overflow-x-auto">
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    'ts-example',
                    `import { Seq, Translation } from 'nucleotide-sequence';

// 1. Instantiate validated DNA sequence
const plasmid = new Seq('GAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTT', 'dna');

// 2. Compute reverse complement (5'→3')
const revComp = plasmid.reverseComplement();
console.log('Antisense:', revComp.raw);

// 3. Scan for Open Reading Frames (min 30 bp)
const orfs = Translation.findOrfs(plasmid.raw, { minLengthBp: 30 });
console.log('Identified ORFs:', orfs.length);

// 4. Translate forward reading frame +1
const protein = Translation.translate(plasmid.raw, 1);
console.log('Translation:', protein);`
                  )
                }
                className="absolute top-3 right-3 p-1.5 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                title="Copy snippet"
              >
                {copiedSnippet === 'ts-example' ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
              </button>
              <pre className="text-[12px] leading-5">
                <span className="text-[var(--text-muted)]">// 1. Instantiate validated DNA sequence</span>{'\n'}
                <span className="text-[var(--accent)]">import</span> &#123; Seq, Translation &#125; <span className="text-[var(--accent)]">from</span> <span className="text-[var(--success)]">&apos;nucleotide-sequence&apos;</span>;{'\n\n'}
                <span className="text-[var(--accent)]">const</span> plasmid = <span className="text-[var(--accent)]">new</span> <span className="text-[var(--text)]">Seq</span>({'\n'}
                {'  '}<span className="text-[var(--success)]">&apos;GAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTT&apos;</span>,{'\n'}
                {'  '}<span className="text-[var(--success)]">&apos;dna&apos;</span>{'\n'}
                );{'\n\n'}
                <span className="text-[var(--text-muted)]">// 2. Compute reverse complement (5&apos;→3&apos;)</span>{'\n'}
                <span className="text-[var(--accent)]">const</span> revComp = plasmid.<span className="text-[var(--accent)]">reverseComplement</span>();{'\n'}
                console.log(<span className="text-[var(--success)]">&apos;Antisense:&apos;</span>, revComp.raw);{'\n\n'}
                <span className="text-[var(--text-muted)]">// 3. Scan for Open Reading Frames (min 30 bp)</span>{'\n'}
                <span className="text-[var(--accent)]">const</span> orfs = Translation.<span className="text-[var(--accent)]">findOrfs</span>(plasmid.raw, &#123; minLengthBp: <span className="text-[var(--warning)]">30</span> &#125;);{'\n'}
                console.log(<span className="text-[var(--success)]">&apos;Identified ORFs:&apos;</span>, orfs.length);{'\n\n'}
                <span className="text-[var(--text-muted)]">// 4. Translate forward reading frame +1</span>{'\n'}
                <span className="text-[var(--accent)]">const</span> protein = Translation.<span className="text-[var(--accent)]">translate</span>(plasmid.raw, <span className="text-[var(--warning)]">1</span>);{'\n'}
                console.log(<span className="text-[var(--success)]">&apos;Translation:&apos;</span>, protein);
              </pre>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
