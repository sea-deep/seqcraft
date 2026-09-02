
import { Link } from 'react-router-dom';
import { BookOpen, FileUp, Download, Eye, TestTube, Cpu, ArrowLeft, Layers, MousePointer2 } from 'lucide-react';

export function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-lg">
          <BookOpen size={20} className="text-[var(--accent)]" />
          SeqCraft Documentation
        </div>
        <Link to="/dashboard" className="text-[13px] font-medium flex items-center gap-2 hover:text-[var(--accent)] transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
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
                <p>SeqCraft bundles hundreds of standard restriction enzymes (EcoRI, BamHI, etc.). The engine automatically calculates cut sites on linear or circular DNA, handles IUPAC ambiguities, and displays sticky/blunt overhang structures.</p>
              </div>

              <div className="bg-[var(--panel)] border border-[var(--border)] p-6 rounded-xl space-y-3">
                <h3 className="text-[var(--text)] font-semibold text-lg">PCR & Primers</h3>
                <p>Navigate to <strong>Tools &rarr; Primer Analysis</strong>.</p>
                <p>Add a forward and reverse primer. SeqCraft calculates the <em>exact binding coordinates</em>, <em>Melting Temperature (Tm)</em>, and <em>GC%</em>. If the primers successfully bind facing each other, it simulates the PCR reaction and shows the amplicon length.</p>
              </div>

              <div className="bg-[var(--panel)] border border-[var(--border)] p-6 rounded-xl space-y-3 md:col-span-2">
                <h3 className="text-[var(--text)] font-semibold text-lg">In Silico Cloning Planner</h3>
                <p>Go to <strong>Tools &rarr; Restriction Cloning</strong> (available in the Action dropdown).</p>
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

        </div>
      </main>
    </div>
  );
}
