import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Copy, Check } from 'lucide-react';
import { SeqCraftLogo } from '../components/ui/SeqCraftLogo';
import { AccountMenu } from '../components/account/AccountMenu';
import { useAuthenticatedUser } from '../platform/use-authenticated-user';

interface SectionLink {
  id: string;
  title: string;
}

const SECTIONS: SectionLink[] = [
  { id: 'coordinates', title: '1. Coordinates and Topology' },
  { id: 'enzymology', title: '2. Restriction Enzymes' },
  { id: 'thermodynamics', title: '3. Melting Temperature and PCR' },
  { id: 'translation', title: '4. Translation and ORFs' },
  { id: 'golden-gate', title: '5. Golden Gate Assembly' },
  { id: 'crispr', title: '6. CRISPR and MMEJ' },
  { id: 'opentrons', title: '7. Opentrons Protocol Export' },
  { id: 'biosecurity', title: '8. Biosecurity Motif Check' },
  { id: 'storage', title: '9. Storage and Worker Model' },
  { id: 'webmcp', title: '10. WebMCP Tool Reference' },
  { id: 'api', title: '11. Programmatic API' },
];

export function DocsPage() {
  const auth = useAuthenticatedUser();
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans flex flex-col selection:bg-[var(--accent)] selection:text-[var(--accent-foreground)]">
      {/* Top Bar */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--panel)] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded bg-[var(--accent)] flex items-center justify-center">
            <SeqCraftLogo size={18} />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-[var(--text)]">SeqCraft Documentation</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-[13px] font-medium flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft size={15} /> Workspace
          </Link>
          {auth.user ? (
            <AccountMenu user={auth.user} />
          ) : auth.status === 'checking' ? (
            <div
              className="size-7 animate-pulse rounded-full border border-[var(--border)] bg-[var(--panel-muted)]"
              aria-label="Checking account"
            />
          ) : null}
        </div>
      </nav>

      {/* Main Layout */}
      <div className="max-w-6xl mx-auto w-full px-6 py-10 grid lg:grid-cols-[220px_1fr] gap-12">
        {/* Functional Sidebar Navigation */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-3 text-[13px]">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Contents
            </div>
            <nav className="space-y-1 border-l border-[var(--border)] pl-3">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className="block text-left w-full py-1 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer text-[12px]"
                >
                  {s.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content Stream */}
        <main className="min-w-0 space-y-12 pb-24 text-[14px] leading-6 text-[var(--text-secondary)]">
          <header className="border-b border-[var(--border)] pb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
              SeqCraft Reference Manual
            </h1>
            <p className="mt-2 text-[14px] text-[var(--text-muted)]">
              Technical specification of coordinates, biophysical models, assembly algorithms, storage layers, and WebMCP tool schemas.
            </p>
          </header>

          {/* Section 1: Coordinates and Topology */}
          <section id="coordinates" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              1. Coordinates and Topology
            </h2>
            <p>
              SeqCraft enforces a strict separation between internal calculation coordinates and biological user-facing coordinates.
            </p>

            <div className="overflow-x-auto border border-[var(--border)] rounded">
              <table className="w-full text-left font-mono text-[12px]">
                <thead className="bg-[var(--panel-muted)] text-[var(--text)] border-b border-[var(--border)]">
                  <tr>
                    <th className="p-2.5">Context</th>
                    <th className="p-2.5">Interval Schema</th>
                    <th className="p-2.5">Index Base</th>
                    <th className="p-2.5">Length Formula</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--panel)]">
                  <tr>
                    <td className="p-2.5 font-semibold text-[var(--text)]">Internal engine</td>
                    <td className="p-2.5 text-[var(--accent)]">[start0, end0Exclusive)</td>
                    <td className="p-2.5">0-based half-open</td>
                    <td className="p-2.5">end0Exclusive - start0</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-[var(--text)]">UI & WebMCP tools</td>
                    <td className="p-2.5 text-[var(--accent)]">[start1, end1]</td>
                    <td className="p-2.5">1-based closed</td>
                    <td className="p-2.5">end1 - start1 + 1</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-semibold text-[var(--text)] text-[14px] pt-1">Origin-Spanning Features in Circular DNA</h3>
            <p>
              For circular molecules of length <code className="font-mono text-[12px]">L</code>, when an annotation crosses the index boundary (<code className="font-mono text-[12px]">start0 &gt; end0Exclusive</code>), it is partitioned into two distinct linear segments:
            </p>
            <div className="p-3 border border-[var(--border)] rounded bg-[var(--panel)] font-mono text-[12px] text-[var(--text)]">
              Segment 1: [start0, L)<br />
              Segment 2: [0, end0Exclusive)<br />
              Total Length = (L - start0) + end0Exclusive
            </div>

            <h3 className="font-semibold text-[var(--text)] text-[14px] pt-1">In-Place Mutation Coordinate Shifts</h3>
            <p>
              When modifying a sequence in-place, feature coordinates update according to these rules:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li><strong>Insertion at index p of length ΔL:</strong> Features with <code className="font-mono text-[11px]">end0 &lt;= p</code> are unchanged. Features with <code className="font-mono text-[11px]">start0 &gt;= p</code> shift by <code className="font-mono text-[11px]">+ΔL</code>. Features where <code className="font-mono text-[11px]">start0 &lt; p &lt; end0</code> expand by <code className="font-mono text-[11px]">+ΔL</code>.</li>
              <li><strong>Deletion from p to p + ΔL:</strong> Features completely enclosed within the deleted range are removed. Features partially overlapping are clipped to the new boundary. Features downstream shift by <code className="font-mono text-[11px]">-ΔL</code>.</li>
              <li><strong>Origin rotation by offset k:</strong> New coordinate is computed as <code className="font-mono text-[11px]">x&apos; = (x - k) mod L</code>. Features crossing the new zero coordinate are split into two segments.</li>
            </ul>
          </section>

          {/* Section 2: Restriction Enzymes */}
          <section id="enzymology" className="scroll-mt-20 space-y-4 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              2. Restriction Enzymes
            </h2>
            <p>
              Recognition sequences are matched against sense and antisense strands using standard IUPAC degenerate base specifications:
              <code className="font-mono text-[12px] ml-1">R=[A,G], Y=[C,T], S=[G,C], W=[A,T], K=[G,T], M=[A,C], B=[C,G,T], D=[A,G,T], H=[A,C,T], V=[A,C,G], N=[A,C,G,T]</code>.
            </p>

            <div className="overflow-x-auto border border-[var(--border)] rounded">
              <table className="w-full text-left font-mono text-[12px]">
                <thead className="bg-[var(--panel-muted)] text-[var(--text)] border-b border-[var(--border)]">
                  <tr>
                    <th className="p-2.5">Enzyme</th>
                    <th className="p-2.5">Class</th>
                    <th className="p-2.5">Recognition Motif</th>
                    <th className="p-2.5">Sense Cut</th>
                    <th className="p-2.5">Antisense Cut</th>
                    <th className="p-2.5">End Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--panel)]">
                  <tr>
                    <td className="p-2.5 font-semibold text-[var(--accent)]">EcoRI</td>
                    <td className="p-2.5">Type II</td>
                    <td className="p-2.5">5&apos;-G^AATTC-3&apos;</td>
                    <td className="p-2.5">+1</td>
                    <td className="p-2.5">+5</td>
                    <td className="p-2.5 text-[var(--success)]">5&apos; Cohesive (AATT)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-[var(--accent)]">BamHI</td>
                    <td className="p-2.5">Type II</td>
                    <td className="p-2.5">5&apos;-G^GATCC-3&apos;</td>
                    <td className="p-2.5">+1</td>
                    <td className="p-2.5">+5</td>
                    <td className="p-2.5 text-[var(--success)]">5&apos; Cohesive (GATC)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-[var(--accent)]">HindIII</td>
                    <td className="p-2.5">Type II</td>
                    <td className="p-2.5">5&apos;-A^AGCTT-3&apos;</td>
                    <td className="p-2.5">+1</td>
                    <td className="p-2.5">+5</td>
                    <td className="p-2.5 text-[var(--success)]">5&apos; Cohesive (AGCT)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-[var(--accent)]">PstI</td>
                    <td className="p-2.5">Type II</td>
                    <td className="p-2.5">5&apos;-CTGCA^G-3&apos;</td>
                    <td className="p-2.5">+5</td>
                    <td className="p-2.5">+1</td>
                    <td className="p-2.5 text-[var(--warning)]">3&apos; Cohesive (TGCA)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-[var(--accent)]">EcoRV</td>
                    <td className="p-2.5">Type II</td>
                    <td className="p-2.5">5&apos;-GAT^ATC-3&apos;</td>
                    <td className="p-2.5">+3</td>
                    <td className="p-2.5">+3</td>
                    <td className="p-2.5 text-[var(--text-muted)]">Blunt</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-[var(--accent)]">BsaI</td>
                    <td className="p-2.5">Type IIS</td>
                    <td className="p-2.5">5&apos;-GGTCTC(N1/N5)-3&apos;</td>
                    <td className="p-2.5">+7</td>
                    <td className="p-2.5">+11</td>
                    <td className="p-2.5 text-[var(--bio-promoter)]">5&apos; Cohesive (4nt variable)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-semibold text-[var(--text)] text-[14px] pt-1">Cohesive End Ligation Rule</h3>
            <p>
              Two fragments are ligatable if their overhangs are exact reverse complements in 5&apos;→3&apos; orientation:
            </p>
            <div className="p-3 border border-[var(--border)] rounded bg-[var(--panel)] font-mono text-[12px] text-[var(--text)]">
              Overhang_A_5&apos; ≡ ReverseComplement(Overhang_B_3&apos;)
            </div>
          </section>

          {/* Section 3: Melting Temperature and PCR */}
          <section id="thermodynamics" className="scroll-mt-20 space-y-4 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              3. Melting Temperature and PCR
            </h2>
            <p>
              Melting temperatures are calculated using the nearest-neighbor thermodynamic parameters from SantaLucia (1998):
            </p>

            <div className="p-3 border border-[var(--border)] rounded bg-[var(--panel)] font-mono text-[12px] space-y-1.5 text-[var(--text)]">
              <div>Tm = (ΔH° / (ΔS° + R · ln(Ct / 4))) - 273.15 + 16.6 · log10([Na+])</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                ΔH°: enthalpy (kcal/mol) · ΔS°: entropy (cal/mol·K) · R: 1.9872 cal/mol·K · Ct: 250 nM primer · [Na+]: 50 mM salt
              </div>
            </div>

            <h3 className="font-semibold text-[var(--text)] text-[14px] pt-1">PCR Amplicon Calculations</h3>
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li><strong>Linear template:</strong> Forward primer must hybridize to antisense strand (3&apos; pointing right); reverse primer must hybridize to sense strand (3&apos; pointing left). Amplicon length is <code className="font-mono text-[11px]">End_Rev - Start_Fwd</code>.</li>
              <li><strong>Circular template:</strong> If <code className="font-mono text-[11px]">Start_Fwd &gt; End_Rev</code>, the amplicon spans the origin with length <code className="font-mono text-[11px]">(L - Start_Fwd) + End_Rev</code>.</li>
            </ul>
          </section>

          {/* Section 4: Translation and ORFs */}
          <section id="translation" className="scroll-mt-20 space-y-4 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              4. Translation and Open Reading Frames
            </h2>
            <p>
              Translations use NCBI Translation Table 1 (Standard Genetic Code).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li><strong>Forward frames:</strong> +1 (offset 0), +2 (offset 1), +3 (offset 2).</li>
              <li><strong>Reverse frames:</strong> -1 (offset 0), -2 (offset 1), -3 (offset 2) evaluated on the reverse complement.</li>
              <li><strong>ORF boundaries:</strong> Begins with canonical start codon <code className="font-mono text-[11px]">ATG</code> (or alternative bacterial starts <code className="font-mono text-[11px]">GTG, TTG</code>) and ends with in-frame stop codons <code className="font-mono text-[11px]">TAA, TAG, TGA</code>.</li>
            </ul>

            <h3 className="font-semibold text-[var(--text)] text-[14px] pt-1">CDS Mutation Classification</h3>
            <div className="grid sm:grid-cols-4 gap-2.5 font-mono text-[11px]">
              <div className="p-2.5 border border-[var(--border)] rounded bg-[var(--panel)]">
                <div className="font-bold text-[var(--text)]">Silent</div>
                <div className="text-[var(--text-muted)] text-[10px]">Amino acid unchanged</div>
              </div>
              <div className="p-2.5 border border-[var(--border)] rounded bg-[var(--panel)]">
                <div className="font-bold text-[var(--warning)]">Missense</div>
                <div className="text-[var(--text-muted)] text-[10px]">Amino acid altered</div>
              </div>
              <div className="p-2.5 border border-[var(--border)] rounded bg-[var(--panel)]">
                <div className="font-bold text-[var(--danger)]">Nonsense</div>
                <div className="text-[var(--text-muted)] text-[10px]">Premature stop (*)</div>
              </div>
              <div className="p-2.5 border border-[var(--border)] rounded bg-[var(--panel)]">
                <div className="font-bold text-[var(--bio-misc)]">Frameshift</div>
                <div className="text-[var(--text-muted)] text-[10px]">ΔL mod 3 ≠ 0</div>
              </div>
            </div>
          </section>

          {/* Section 5: Golden Gate Assembly */}
          <section id="golden-gate" className="scroll-mt-20 space-y-4 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              5. Golden Gate Assembly
            </h2>
            <p>
              Simulates multi-part directional assembly using Type IIS restriction endonucleases (BsaI, BsmBI, BbsI, PaqCI, SapI).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li><strong>Junction analysis:</strong> Generates 4nt single-stranded overhangs. The assembly solver models fragment junctions as an undirected graph and verifies that a single closed cycle exists without orphan or degenerate junctions.</li>
              <li><strong>Domestication:</strong> When internal recognition sequences are detected within a CDS, the domesticator evaluates synonymous codons to eliminate the recognition site while preserving 100% of the amino acid sequence.</li>
            </ul>
          </section>

          {/* Section 6: CRISPR and MMEJ */}
          <section id="crispr" className="scroll-mt-20 space-y-4 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              6. CRISPR and MMEJ
            </h2>
            <p>
              Scans target sequences for SpCas9 protospacer adjacent motifs (<code className="font-mono text-[12px]">5&apos;-NGG-3&apos;</code>).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li><strong>Cut position:</strong> Cleavage occurs exactly 3 bp upstream of the PAM on both strands.</li>
              <li><strong>Quality parameters:</strong> Scores 20nt spacer GC content (optimal range: 40%–60%) and flags poly-T tracts (≥4 consecutive Ts) that cause premature RNA Pol III termination.</li>
              <li><strong>MMEJ forecasting:</strong> Scans 2–8 bp microhomology sequences flanking the double-strand break to calculate deletion sizes and forecast out-of-frame knockout probabilities.</li>
            </ul>
          </section>

          {/* Section 7: Opentrons Protocol Export */}
          <section id="opentrons" className="scroll-mt-20 space-y-4 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              7. Opentrons Protocol Export
            </h2>
            <p>
              Exports Python scripts compatible with Opentrons API v2.15 for OT-2 and Flex automated liquid handlers.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li><strong>Dead volume:</strong> Adds 10% volume overage to all reagent master mix calculations.</li>
              <li><strong>Thermocycler elongation:</strong> Calculated at 30 seconds per kilobase (30 s/kb) of target amplicon length.</li>
              <li><strong>Labware:</strong> Source rack is <code className="font-mono text-[11px]">opentrons_24_tuberack_generic_2ml_screwcap</code>; destination plate is <code className="font-mono text-[11px]">nest_96_wellplate_100ul_pcr_full_skirt</code>.</li>
            </ul>
          </section>

          {/* Section 8: Biosecurity Motif Check */}
          <section id="biosecurity" className="scroll-mt-20 space-y-4 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              8. Biosecurity Motif Check
            </h2>
            <p>
              Runs client-side exact k-mer matching against 17 reference sequences from regulated agent databases.
            </p>
            <div className="p-3 border border-[var(--border)] rounded bg-[var(--panel)] text-[12px] text-[var(--text-muted)]">
              <strong>Limitation notice:</strong> This check is an in-browser diagnostic tool. It is not a regulatory compliance determination and does not replace institutional oversight or commercial gene synthesis provider screening.
            </div>
          </section>

          {/* Section 9: Storage and Worker Model */}
          <section id="storage" className="scroll-mt-20 space-y-4 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              9. Storage and Worker Model
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-[13px]">
              <li><strong>Sequence storage:</strong> Kept in browser Origin Private File System (OPFS) when available, with IndexedDB (<code className="font-mono text-[11px]">idb-keyval</code>) fallback.</li>
              <li><strong>Cloud sync:</strong> The server receives only sequence-free metadata: document ID, name, topology, length, and storage key. Raw sequence bytes are never sent over the network.</li>
              <li><strong>Web Workers:</strong> FASTA parsing (<code className="font-mono text-[11px]">fasta-importer.worker.ts</code>) and sequence diffing (<code className="font-mono text-[11px]">sequence-diff.worker.ts</code>) execute off the main thread.</li>
              <li><strong>Virtualization:</strong> The linear sequence viewer computes coordinate-to-screen pixel positions using monospace <code className="font-mono text-[11px]">ch</code> units, giving O(1) viewport index resolution without measuring DOM text nodes.</li>
            </ul>
          </section>

          {/* Section 10: WebMCP Tool Reference */}
          <section id="webmcp" className="scroll-mt-20 space-y-4 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              10. WebMCP Tool Reference
            </h2>
            <p>
              SeqCraft exposes 50 structured biological and workspace tools to browser-connected AI agents via <code className="font-mono text-[12px]">window.document.modelContext</code>.
            </p>

            <div className="overflow-x-auto border border-[var(--border)] rounded font-mono text-[11px]">
              <table className="w-full text-left">
                <thead className="bg-[var(--panel-muted)] text-[var(--text)] border-b border-[var(--border)]">
                  <tr>
                    <th className="p-2.5">Tool Name</th>
                    <th className="p-2.5">Effect Class</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--panel)]">
                  {/* Context & Capabilities */}
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_get_workspace_context</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Bootstrap state: active molecule, selection, features, transaction</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_get_capabilities</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Feature contracts, coordinate models, privacy rules</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_get_selected_context</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Selection coordinates, sequence slice, overlapping annotations</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_get_document_revision</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Canonical revision number and SHA-256 sequence hash</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_get_transaction_status</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Staged transaction lifecycle, invariant report, approval status</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>

                  {/* Navigation & Selection */}
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_focus_region</td>
                    <td className="p-2.5">navigation</td>
                    <td className="p-2.5">Scroll and highlight nucleotide range [start1, end1]</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_select_range</td>
                    <td className="p-2.5">navigation</td>
                    <td className="p-2.5">Set workspace selection interval [start1, end1]</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_clear_selection</td>
                    <td className="p-2.5">navigation</td>
                    <td className="p-2.5">Clear active sequence selection</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_set_active_view</td>
                    <td className="p-2.5">navigation</td>
                    <td className="p-2.5">Switch view between 'map', 'sequence', and 'topology'</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_show_feature</td>
                    <td className="p-2.5">navigation</td>
                    <td className="p-2.5">Center viewport and select feature by ID or name</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_show_restriction_site</td>
                    <td className="p-2.5">navigation</td>
                    <td className="p-2.5">Navigate linear and 3D map views to restriction recognition site</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>

                  {/* Documents */}
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_list_documents</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">List metadata for all open sequence documents</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_get_active_document</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Active construct length, topology, revision, feature count</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_set_active_document</td>
                    <td className="p-2.5">workspace_ephemeral</td>
                    <td className="p-2.5">Switch active document in workspace</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_create_document</td>
                    <td className="p-2.5">document_destructive</td>
                    <td className="p-2.5">Create new construct from raw sequence string</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_delete_document</td>
                    <td className="p-2.5">document_destructive</td>
                    <td className="p-2.5">Close and delete construct from workspace</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_duplicate_document</td>
                    <td className="p-2.5">document_destructive</td>
                    <td className="p-2.5">Create deep copy of an existing sequence document</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_update_document_metadata</td>
                    <td className="p-2.5">document_metadata</td>
                    <td className="p-2.5">Update name, topology (linear/circular), or alphabet</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_create_document_from_region</td>
                    <td className="p-2.5">document_destructive</td>
                    <td className="p-2.5">Extract sub-region into new independent sequence document</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_copy_region_between_documents</td>
                    <td className="p-2.5">sequence_mutation</td>
                    <td className="p-2.5">Stage inserting sequence slice into target document</td>
                    <td className="p-2.5 text-[var(--danger)] font-bold">Required</td>
                  </tr>

                  {/* Features & Primers */}
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_list_features</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Return all feature annotations on construct</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_select_feature</td>
                    <td className="p-2.5">navigation</td>
                    <td className="p-2.5">Select a feature by ID in workspace store</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_mutate_feature</td>
                    <td className="p-2.5">annotation_mutation</td>
                    <td className="p-2.5">Create, update, or delete feature annotations</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_detect_known_features</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Scan plasmid against curated database of known elements</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_propose_annotation</td>
                    <td className="p-2.5">annotation_mutation</td>
                    <td className="p-2.5">Apply detected known annotation to document table</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_list_primers</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">List custom primers configured for target molecule</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_mutate_primer</td>
                    <td className="p-2.5">annotation_mutation</td>
                    <td className="p-2.5">Create, edit, or delete primers on construct</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_analyze_primer</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Calculate primer Tm, GC%, and binding loci</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_simulate_pcr</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Simulate linear/circular PCR amplicon sizes</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>

                  {/* Digestion & Cloning */}
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_analyze_restriction_sites</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Scan sequence for restriction enzyme cut positions</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_simulate_digest</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Cleave construct and return fragment lengths & overhangs</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_simulate_golden_gate</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Simulate multi-part Type IIS assembly (BsaI, BsmBI, etc.)</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_domesticate_sequence</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Find synonymous mutations to abolish internal cut sites</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_stage_domestication_candidate</td>
                    <td className="p-2.5">sequence_mutation</td>
                    <td className="p-2.5">Stage candidate domestication mutation for approval</td>
                    <td className="p-2.5 text-[var(--danger)] font-bold">Required</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_prepare_restriction_clone</td>
                    <td className="p-2.5">workspace_ephemeral</td>
                    <td className="p-2.5">Stage directional restriction cloning proposal</td>
                    <td className="p-2.5 text-[var(--danger)] font-bold">Required</td>
                  </tr>

                  {/* Sequence Mutations */}
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_edit_sequence</td>
                    <td className="p-2.5">sequence_mutation</td>
                    <td className="p-2.5">Insert, delete, or replace sequence in-place</td>
                    <td className="p-2.5 text-[var(--danger)] font-bold">Required</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_reverse_complement_region</td>
                    <td className="p-2.5">sequence_mutation</td>
                    <td className="p-2.5">Stage reverse-complementing sequence region</td>
                    <td className="p-2.5 text-[var(--danger)] font-bold">Required</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_rotate_origin</td>
                    <td className="p-2.5">sequence_mutation</td>
                    <td className="p-2.5">Re-index circular plasmid origin to new coordinate</td>
                    <td className="p-2.5 text-[var(--danger)] font-bold">Required</td>
                  </tr>

                  {/* History & Analysis */}
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_undo</td>
                    <td className="p-2.5">workspace_ephemeral</td>
                    <td className="p-2.5">Revert last sequence or metadata mutation</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_redo</td>
                    <td className="p-2.5">workspace_ephemeral</td>
                    <td className="p-2.5">Re-apply last undone mutation</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_get_history</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Inspect snapshot undo/redo stack & event history</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_restore_revision</td>
                    <td className="p-2.5">sequence_mutation</td>
                    <td className="p-2.5">Stage restoring sequence to snapshot in history</td>
                    <td className="p-2.5 text-[var(--danger)] font-bold">Required</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_compare_documents</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Circular-invariant, reverse-complement sequence diff</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_find_orfs</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Scan 6 frames for open reading frames</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_find_crispr_targets</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Scan SpCas9 PAMs and forecast MMEJ repair</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_screen_biosecurity</td>
                    <td className="p-2.5">read</td>
                    <td className="p-2.5">Screen against curated pathogen k-mer signatures</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>

                  {/* IO & Automation */}
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_import_sequence_text</td>
                    <td className="p-2.5">document_destructive</td>
                    <td className="p-2.5">Parse and import FASTA, GenBank, or raw sequence</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_export_document</td>
                    <td className="p-2.5">export</td>
                    <td className="p-2.5">Export GenBank (.gb), FASTA (.fasta), or JSON</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_generate_opentrons_protocol</td>
                    <td className="p-2.5">export</td>
                    <td className="p-2.5">Generate Opentrons Python protocol (API v2.15)</td>
                    <td className="p-2.5 text-[var(--success)]">No</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--accent)]">seqcraft_execute_actions</td>
                    <td className="p-2.5">sequence_mutation</td>
                    <td className="p-2.5">Execute batch sequence & annotation action plan</td>
                    <td className="p-2.5 text-[var(--danger)] font-bold">Required</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 11: Programmatic API */}
          <section id="api" className="scroll-mt-20 space-y-4 border-t border-[var(--border)] pt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
                11. Programmatic API (nucleotide-sequence)
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
              The sequence engine is published as a zero-dependency npm package. Usage in Node.js or browser scripts:
            </p>

            <div className="relative border border-[var(--border)] rounded bg-[var(--panel)] p-4 font-mono text-[12px] text-[var(--text)] overflow-x-auto">
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    'ts-example',
                    `import { Seq, Translation } from 'nucleotide-sequence';

const seq = new Seq('GAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTT', 'dna');
const revComp = seq.reverseComplement();
const orfs = Translation.findOrfs(seq.raw, { minLengthBp: 30 });
const protein = Translation.translate(seq.raw, 1);`
                  )
                }
                className="absolute top-3 right-3 p-1 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                title="Copy snippet"
              >
                {copiedSnippet === 'ts-example' ? <Check size={13} className="text-[var(--success)]" /> : <Copy size={13} />}
              </button>
              <pre className="text-[12px] leading-5">
                <span className="text-[var(--accent)]">import</span> &#123; Seq, Translation &#125; <span className="text-[var(--accent)]">from</span> <span className="text-[var(--success)]">&apos;nucleotide-sequence&apos;</span>;{'\n\n'}
                <span className="text-[var(--accent)]">const</span> seq = <span className="text-[var(--accent)]">new</span> <span className="text-[var(--text)]">Seq</span>(<span className="text-[var(--success)]">&apos;GAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTT&apos;</span>, <span className="text-[var(--success)]">&apos;dna&apos;</span>);{'\n'}
                <span className="text-[var(--accent)]">const</span> revComp = seq.<span className="text-[var(--accent)]">reverseComplement</span>();{'\n'}
                <span className="text-[var(--accent)]">const</span> orfs = Translation.<span className="text-[var(--accent)]">findOrfs</span>(seq.raw, &#123; minLengthBp: <span className="text-[var(--warning)]">30</span> &#125;);{'\n'}
                <span className="text-[var(--accent)]">const</span> protein = Translation.<span className="text-[var(--accent)]">translate</span>(seq.raw, <span className="text-[var(--warning)]">1</span>);
              </pre>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
