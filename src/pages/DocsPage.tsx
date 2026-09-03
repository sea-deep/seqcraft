
import { Link } from 'react-router-dom';
import { FileUp, Download, Eye, TestTube, Cpu, ArrowLeft, Layers, MousePointer2, Code2, ExternalLink, Terminal } from 'lucide-react';
import { SeqCraftLogo } from '../components/ui/SeqCraftLogo';
import { AccountMenu } from '../components/account/AccountMenu';
import { useAuthenticatedUser } from '../platform/use-authenticated-user';

export function DocsPage() {
  const auth = useAuthenticatedUser();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-lg">
          <SeqCraftLogo size={20} />
          SeqCraft Documentation
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-[13px] font-medium flex items-center gap-2 hover:text-[var(--accent)] transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          {auth.user ? (
            <AccountMenu user={auth.user} />
          ) : auth.status === 'checking' ? (
            <div className="size-8 animate-pulse rounded-full border border-[var(--border)] bg-[var(--panel-muted)]" aria-label="Checking account" />
          ) : null}
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full p-8 md:p-12">
        <header className="mb-12 border-b border-[var(--border)] pb-8">
          <h1 className="text-4xl font-bold mb-4">A to Z Guide</h1>
          <p className="text-lg text-[var(--text-muted)] leading-relaxed">
            Everything you need to know to master SeqCraft. 
            From importing your first plasmid to orchestrating complex AI-driven cloning workflows.
          </p>
        </header>

        <div className="space-y-16 pb-20">
          
          {/* Section 1 */}
          <section id="getting-started" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <FileUp size={24} className="text-[var(--accent)]" /> 1. Importing & Exporting
            </h2>
            <div className="prose prose-invert max-w-none text-[15px] text-[var(--text-muted)] space-y-4">
              <p>SeqCraft is a <strong>local-first browser application</strong>. This means all of your data stays on your machine until you explicitly export it. </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-[var(--panel)] border border-[var(--border)] p-5 rounded-xl">
                  <h3 className="text-[var(--text)] font-semibold mb-2">Supported Import Formats</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>FASTA (.fasta):</strong> Raw sequence data. Topology defaults to linear.</li>
                    <li><strong>GenBank (.gb, .gbk):</strong> Industry standard format. Imports sequence, features (genes, promoters, etc.), and circular topology.</li>
                    <li><strong>Raw Text:</strong> Copy-paste raw ACTG characters directly.</li>
                  </ul>
                </div>
                <div className="bg-[var(--panel)] border border-[var(--border)] p-5 rounded-xl">
                  <h3 className="text-[var(--text)] font-semibold mb-2 flex items-center gap-2">Exporting <Download size={16}/></h3>
                  <p className="mb-2">Click the <strong>Export</strong> button in the top right of the Editor. </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>.seqcraft:</strong> Lossless JSON. Preserves features, primer designs, and history. Recommended for backups.</li>
                    <li><strong>.fasta:</strong> Lightweight sequence export.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section id="visualizations" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Eye size={24} className="text-[var(--accent)]" /> 2. Core Visualizations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[15px] text-[var(--text-muted)]">
              
              <div className="bg-[var(--panel)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
                    <Layers size={18} className="text-[var(--accent)]" /> Sequence View
                  </h3>
                  <p className="text-[14px] leading-relaxed">The linear DNA viewer. It displays the forward and reverse complement strands. Above the sequence, you'll see your <strong>Features</strong> and dynamically translated <strong>ORFs</strong> with frame indicators.</p>
                </div>
              </div>

              <div className="bg-[var(--panel)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
                    <MousePointer2 size={18} className="text-[var(--accent)]" /> Map View
                  </h3>
                  <p className="text-[14px] leading-relaxed">Deterministic coordinate view. Origin at 12 o’clock, clockwise progression, strand-directional ribbons, outward base ticks, and interactive drag selection. Switch between 2D and 3D anytime.</p>
                </div>
              </div>

              <div className="bg-[var(--panel)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
                    <Eye size={18} className="text-[var(--accent)]" /> Compare View
                  </h3>
                  <p className="text-[14px] leading-relaxed">Biological change report: substitutions, insertions, deletions, annotation shifts, and CDS/protein consequences. Circular origin rotations and reverse complements are normalized automatically.</p>
                </div>
              </div>

            </div>
          </section>

          {/* Section 3 */}
          <section id="simulations" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <TestTube size={24} className="text-[var(--success)]" /> 3. Scientific Workflows
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[15px] text-[var(--text-muted)]">
              
              <div className="bg-[var(--panel)] border border-[var(--border)] p-6 rounded-xl space-y-3">
                <h3 className="text-[var(--text)] font-semibold text-lg">Restriction Digest</h3>
                <p>Navigate to <strong>Tools &rarr; Restriction Analysis</strong>.</p>
                <p>SeqCraft currently bundles 11 commonly used restriction enzymes (including EcoRI and BamHI). The engine calculates cut sites on linear or circular DNA, handles IUPAC ambiguities, and displays sticky/blunt overhang structures.</p>
              </div>

              <div className="bg-[var(--panel)] border border-[var(--border)] p-6 rounded-xl space-y-3">
                <h3 className="text-[var(--text)] font-semibold text-lg">PCR & Primers</h3>
                <p>Navigate to <strong>Tools &rarr; Primer Analysis</strong>.</p>
                <p>Add a forward and reverse primer. SeqCraft calculates the <em>exact binding coordinates</em>, <em>Melting Temperature (Tm)</em>, and <em>GC%</em>. If the primers successfully bind facing each other, it simulates the PCR reaction and shows the amplicon length.</p>
              </div>

              <div className="bg-[var(--panel)] border border-[var(--border)] p-6 rounded-xl space-y-3 md:col-span-2">
                <h3 className="text-[var(--text)] font-semibold text-lg">In Silico Cloning Planner</h3>
                <p>Go to <strong>Workflows &rarr; Restriction Cloning</strong>.</p>
                <p>This is a human-in-the-loop workflow for generating recombinant DNA. Select a Vector and an Insert from your workspace, pick the restriction enzymes for each, and SeqCraft will validate the sticky ends. If compatible, it calculates the correct insertion orientation and transfers all sequence features into the new circular vector map.</p>
              </div>

            </div>
          </section>

          {/* Section 4 */}
          <section id="ai-agent" className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Cpu size={24} className="text-purple-500" /> 4. WebMCP AI Integration
            </h2>
            <div className="prose prose-invert max-w-none text-[15px] text-[var(--text-muted)] space-y-4">
              <p>SeqCraft is uniquely built for the Model Context Protocol (MCP). If you run SeqCraft inside a WebMCP-compatible browser (or agent environment), you can simply <em>talk to your DNA</em>.</p>
              
              <p className="bg-[var(--panel-muted)] p-4 rounded-lg border border-[var(--border)] text-[14px]">
                <strong>Example prompts you can use with your Agent:</strong><br/>
                - "Find all ORFs larger than 300bp in the active sequence and annotate them."<br/>
                - "Are there any unique EcoRI cut sites in this plasmid?"<br/>
                - "Design primers to amplify the GFP gene."<br/>
                - "Clone the insert from Document A into Document B using BamHI and HindIII."
              </p>

              <h3 className="text-lg font-semibold text-[var(--text)] mt-6">Safety & Approvals</h3>
              <p>SeqCraft enforces a strict <strong>Human-in-the-loop (HITL)</strong> policy. Whenever the AI proposes a change (like adding an annotation or drafting a cloning product), the change is staged in the <strong>Agent Activity Panel</strong> (accessible via the right sidebar in the Editor). No destructive edits are applied to your documents until you click "Approve".</p>
            </div>
          </section>

          {/* Section 5 */}
          <section id="nucleotide-sequence" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Code2 size={24} className="text-[var(--accent)]" /> 5. Scientific Engine: nucleotide-sequence
              </h2>
              <a 
                href="https://www.npmjs.com/package/nucleotide-sequence" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[12px] font-mono text-[var(--accent)] hover:bg-[var(--panel-muted)] transition-colors shadow-sm"
              >
                <Terminal size={13} />
                npm i nucleotide-sequence
                <ExternalLink size={12} className="ml-0.5 opacity-70" />
              </a>
            </div>

            <div className="prose prose-invert max-w-none text-[15px] text-[var(--text-muted)] space-y-4">
              <p>
                All molecular biology calculations, nucleotide transforms, and biological coordinate assertions in SeqCraft are driven by the open-source <a href="https://www.npmjs.com/package/nucleotide-sequence" target="_blank" rel="noreferrer" className="text-[var(--accent)] underline underline-offset-4 font-semibold">nucleotide-sequence</a> npm package.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-[var(--panel)] border border-[var(--border)] p-4 rounded-xl space-y-2">
                  <h3 className="text-[var(--text)] font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> IUPAC Alphabet Rigor
                  </h3>
                  <p className="text-[13px] leading-relaxed">
                    Full enforcement of IUPAC nucleotide specifications for both DNA and RNA (<code className="text-[var(--accent)] font-mono">A, C, G, T, U, R, Y, S, W, K, M, B, D, H, V, N</code>). Degenerate IUPAC consensus matches are calculated without lossy regex conversions.
                  </p>
                </div>

                <div className="bg-[var(--panel)] border border-[var(--border)] p-4 rounded-xl space-y-2">
                  <h3 className="text-[var(--text)] font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--bio-cds)]" /> 6-Frame Translation & ORFs
                  </h3>
                  <p className="text-[13px] leading-relaxed">
                    Instantaneous amino acid translation across forward frames (+1, +2, +3) and reverse complement frames (-1, -2, -3). Dynamic ORF scanning identifies start/stop codons with customizable minimum length thresholds.
                  </p>
                </div>

                <div className="bg-[var(--panel)] border border-[var(--border)] p-4 rounded-xl space-y-2">
                  <h3 className="text-[var(--text)] font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--bio-promoter)]" /> Thermodynamics & Primer Chemistry
                  </h3>
                  <p className="text-[13px] leading-relaxed">
                    Provides nearest-neighbor melting temperature (Tm) estimation, precise GC% profiling, and exact directional primer binding checks on both linear and circular templates.
                  </p>
                </div>

                <div className="bg-[var(--panel)] border border-[var(--border)] p-4 rounded-xl space-y-2">
                  <h3 className="text-[var(--text)] font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--warning)]" /> Protein Consequence Modeling
                  </h3>
                  <p className="text-[13px] leading-relaxed">
                    Codon-aware mutation impact evaluation: automatically classifies biological mutations into missense, nonsense (premature stop), silent (synonymous), and frameshift alterations within annotated CDS features.
                  </p>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-[var(--text)] mt-6">Developer Usage Example</h3>
              <p className="text-[13px]">You can use the exact same computational core in your own Node.js, CLI, or browser applications:</p>
              
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-editor)] p-4 font-mono text-[12px] text-[var(--text-secondary)] overflow-x-auto">
                <pre className="space-y-1">
                  <span className="text-[var(--text-muted)]">// 1. Initialize DNA sequence with strict IUPAC validation</span><br/>
                  <span className="text-[var(--accent)]">import</span> &#123; Seq, Translation &#125; <span className="text-[var(--accent)]">from</span> <span className="text-[var(--success)]">'nucleotide-sequence'</span>;<br/><br/>
                  <span className="text-[var(--accent)]">const</span> plasmid = <span className="text-[var(--accent)]">new</span> <span className="text-[var(--text)]">Seq</span>(<span className="text-[var(--success)]">'ATGGTGAGCAAGGGCGAG'</span>, <span className="text-[var(--success)]">'dna'</span>);<br/>
                  <span className="text-[var(--text-muted)]">// Reverse complement preserving 5'→3' semantics</span><br/>
                  <span className="text-[var(--accent)]">const</span> revComp = plasmid.<span className="text-[var(--accent)]">reverseComplement</span>();<br/><br/>
                  <span className="text-[var(--text-muted)]">// 2. Dynamic 6-frame translation and ORF discovery</span><br/>
                  <span className="text-[var(--accent)]">const</span> orfs = Translation.<span className="text-[var(--accent)]">findOrfs</span>(plasmid.raw, &#123; minLengthBp: <span className="text-[var(--warning)]">150</span> &#125;);<br/>
                  <span className="text-[var(--accent)]">const</span> translation = Translation.<span className="text-[var(--accent)]">translate</span>(plasmid.raw, <span className="text-[var(--warning)]">1</span>);
                </pre>
              </div>
            </div>
          </section>

          {/* Section 6: Next-Gen Capabilities (USPs) & WebMCP */}
          <section id="next-gen-usps" className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-[var(--text)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
              <span className="text-[var(--accent)]">6.</span> Next-Generation Capabilities & WebMCP Extensions
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              SeqCraft connects in-silico genetic engineering, bench-protocol drafting, and local diagnostic screening through its native 24-tool WebMCP architecture:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--panel)] border border-[var(--border)] p-4 rounded-xl space-y-2 col-span-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[var(--text)] font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500" /> Active In-Place Sequence Manipulation Suite
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-400 font-bold">Coordinate-Aware Engine</span>
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  Execute direct, in-place sequence engineering including insertions, deletions, replacements, strand inversions (reverse complement), and circular plasmid origin re-indexing. Coordinates of all existing biological features (CDS, promoters, terminators) are mathematically shifted, expanded, clipped, or partitioned without manual re-annotation. Includes a built-in catalog of standard biological tags and motifs (His-6, FLAG, HA, Myc, TEV, Kozak, T7, (GGGGS)3).
                </p>
                <div className="text-[11px] font-mono text-[var(--text-muted)]">WebMCP: seqcraft_edit_sequence, seqcraft_rotate_origin</div>
              </div>

              <div className="bg-[var(--panel)] border border-[var(--border)] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[var(--text)] font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> Opentrons Robotics Protocol Compiler
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--accent-soft)] text-[var(--accent)] font-bold">OT-2 & Flex</span>
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  Exports executable Python scripts (API v2.15) for automated liquid handler reaction setup. Computes master mixes with 10% dead-volume overages, 24-tube rack coordinates, 96-well reaction maps, and thermocycler elongation timings.
                </p>
                <div className="text-[11px] font-mono text-[var(--text-muted)]">WebMCP: seqcraft_generate_opentrons_protocol</div>
              </div>

              <div className="bg-[var(--panel)] border border-[var(--border)] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[var(--text)] font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--success)]" /> CRISPR Radar & MMEJ Forecaster
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--success)]/15 text-[var(--success)] font-bold">SpCas9 / MMEJ</span>
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  Scans 5′-NGG-3′ PAMs on both strands with thermodynamic scoring, poly-T transcription abort penalties, and microhomology-mediated end joining (MMEJ) repair deletion forecasting to maximize out-of-frame knockout probability.
                </p>
                <div className="text-[11px] font-mono text-[var(--text-muted)]">WebMCP: seqcraft_find_crispr_targets</div>
              </div>

              <div className="bg-[var(--panel)] border border-[var(--border)] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[var(--text)] font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--bio-promoter)]" /> Golden Gate Assembly & Domestication
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bio-promoter)]/15 text-[var(--bio-promoter)] font-bold">Type IIS</span>
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  Simulates multi-fragment scarless assembly (BsaI, BsmBI, BbsI, PaqCI, SapI) with 4nt overhang junction verification. Includes an intelligent domesticator that eliminates internal recognition sites via synonymous (silent) codon substitutions.
                </p>
                <div className="text-[11px] font-mono text-[var(--text-muted)]">WebMCP: seqcraft_simulate_golden_gate, seqcraft_domesticate_sequence</div>
              </div>

              <div className="bg-[var(--panel)] border border-[var(--border)] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[var(--text)] font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--warning)]" /> Local Biosecurity Motif Pre-Screen
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--warning)]/15 text-[var(--warning)] font-bold">Diagnostic Only</span>
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  A private, client-side comparison against 17 curated diagnostic k-mers associated with selected controlled-agent examples. It can flag motifs for review, but it is not a regulatory compliance decision and does not replace commercial-provider or institutional screening.
                </p>
                <div className="text-[11px] font-mono text-[var(--text-muted)]">WebMCP: seqcraft_screen_biosecurity</div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
