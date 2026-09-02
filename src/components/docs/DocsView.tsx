import React from 'react';
import { BookOpen, FileUp, Download, Eye, TestTube, Cpu, Code2, Terminal, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

export function DocsDialog({ children, open, onOpenChange }: { children?: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--panel)]">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--accent)]" />
            SeqCraft Documentation
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg)] text-[var(--text)]">
          <div className="mx-auto max-w-2xl space-y-8 pb-10">
            
            <div>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
                Welcome to SeqCraft! SeqCraft is an advanced, pure-browser DNA sequence editor, visualization tool, and virtual cloning environment designed for the AI-native era. All of your data remains locally in your browser unless explicitly exported.
              </p>
            </div>

            {/* Getting Started */}
            <section className="space-y-3">
              <h2 className="text-[14px] font-semibold text-[var(--text)] border-b border-[var(--border)] pb-1.5 flex items-center gap-2">
                <FileUp size={14} className="text-[var(--accent)]" /> Data Management
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-[var(--border)] rounded-md p-3 bg-[var(--panel)]">
                  <h3 className="font-semibold mb-1 text-[13px]">Importing</h3>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Import sequences using the button in the Project sidebar. We support raw DNA sequences, standard FASTA (.fasta), and fully annotated GenBank (.gb, .gbk) files.
                  </p>
                </div>
                <div className="border border-[var(--border)] rounded-md p-3 bg-[var(--panel)]">
                  <h3 className="font-semibold mb-1 text-[13px] flex items-center gap-1.5">Exporting <Download size={12}/></h3>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Click Export in the top right to download your sequence. Choose `.seqcraft` to losslessly save all your annotations, history, and metadata.
                  </p>
                </div>
              </div>
            </section>

            {/* Views */}
            <section className="space-y-3">
              <h2 className="text-[14px] font-semibold text-[var(--text)] border-b border-[var(--border)] pb-1.5 flex items-center gap-2">
                <Eye size={14} className="text-[var(--accent)]" /> Visualization & Tools
              </h2>
              <ul className="space-y-3 text-[12px] text-[var(--text-muted)] pl-1">
                <li><strong className="text-[var(--text)] block mb-0.5">Sequence View:</strong> The primary linear view of your DNA. Features (genes, promoters) and translations (ORFs) are mapped directly onto the bases.</li>
                <li><strong className="text-[var(--text)] block mb-0.5">Map View:</strong> Circular molecules open in a deterministic 2D map for coordinate work. Switch to the secondary 3D view when spatial exploration is useful.</li>
                <li><strong className="text-[var(--text)] block mb-0.5">Enzymes View:</strong> Run virtual restriction digests. Standard enzymes are included. Hover over fragments to see their lengths and overhangs.</li>
                <li><strong className="text-[var(--text)] block mb-0.5">Primers View:</strong> Simulate PCR amplification. SeqCraft automatically calculates Tm, GC%, and exact binding coordinates for primers on linear or circular templates.</li>
                <li><strong className="text-[var(--text)] block mb-0.5">Compare View:</strong> Align your current sequence against other sequences in your workspace to find mutations or verify clones.</li>
              </ul>
            </section>

            {/* Advanced Workflows */}
            <section className="space-y-3">
              <h2 className="text-[14px] font-semibold text-[var(--text)] border-b border-[var(--border)] pb-1.5 flex items-center gap-2">
                <TestTube size={14} className="text-[var(--accent)]" /> Restriction Cloning
              </h2>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed pl-1">
                Access the Cloning Planner via <code className="bg-[var(--panel-muted)] px-1 py-0.5 rounded text-[11px] font-mono text-[var(--text)]">Tools &rarr; Restriction Cloning</code>. 
                SeqCraft will guide you through selecting a Vector and Insert, picking restriction sites, analyzing sticky-end compatibility, and generating the recombinant construct.
              </p>
            </section>

            {/* AI Integration */}
            <section className="space-y-3">
              <h2 className="text-[14px] font-semibold text-[var(--text)] border-b border-[var(--border)] pb-1.5 flex items-center gap-2">
                <Cpu size={14} className="text-[var(--accent)]" /> WebMCP Agent Integration
              </h2>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed pl-1">
                SeqCraft fully integrates with WebMCP (Model Context Protocol). If you are using SeqCraft inside an AI agent environment (like Claude or Gemini), the agent can natively interact with your sequences. It can search for ORFs, analyze restriction sites, propose annotations, and even draft cloning plans for you. 
              </p>
              <div className="bg-[var(--panel-muted)] p-3 rounded-md border border-[var(--border)] mt-2">
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  Pro tip: You can review all actions taken by the AI in the Agent Activity panel on the right side of the screen. No destructive edits will be made without your manual approval.
                </p>
              </div>
            </section>

            {/* Scientific Engine */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                <h2 className="text-[14px] font-semibold text-[var(--text)] flex items-center gap-2">
                  <Code2 size={14} className="text-[var(--accent)]" /> Powered by nucleotide-sequence
                </h2>
                <a 
                  href="https://www.npmjs.com/package/nucleotide-sequence" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-mono text-[var(--accent)] hover:underline"
                >
                  <Terminal size={11} />
                  v2.0.0
                  <ExternalLink size={10} />
                </a>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed pl-1">
                SeqCraft relies on the <a href="https://www.npmjs.com/package/nucleotide-sequence" target="_blank" rel="noreferrer" className="text-[var(--accent)] underline font-medium">nucleotide-sequence</a> library for IUPAC validation, reverse complement transformations, 6-frame translations, ORF detection, and protein consequence predictions.
              </p>
            </section>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
