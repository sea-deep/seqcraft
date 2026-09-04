import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Search } from 'lucide-react';
import { AccountMenu } from '../components/account/AccountMenu';
import { SeqCraftLogo } from '../components/ui/SeqCraftLogo';
import { BUILTIN_ENZYMES } from '../data/restriction-enzymes';
import { CAS_NUCLEASES } from '../domain/crispr';
import { REGULATED_AGENTS } from '../scientific/biosecurity';
import { useAuthenticatedUser } from '../platform/use-authenticated-user';
import { ALL_SEQCRAFT_TOOLS } from '../webmcp/registry';
import type { EffectClass, SeqCraftToolDefinition } from '../webmcp/types';

interface SectionLink {
  id: string;
  title: string;
}

interface ToolReferenceRow {
  tool: SeqCraftToolDefinition;
  aliases: string[];
}

const SECTIONS: SectionLink[] = [
  { id: 'coordinates', title: '1. Coordinates and topology' },
  { id: 'restriction', title: '2. Restriction and digestion' },
  { id: 'primers', title: '3. Primers and PCR' },
  { id: 'translation', title: '4. Translation and ORFs' },
  { id: 'golden-gate', title: '5. Golden Gate' },
  { id: 'crispr', title: '6. CRISPR and MMEJ' },
  { id: 'opentrons', title: '7. Opentrons export' },
  { id: 'biosecurity', title: '8. Biosecurity screen' },
  { id: 'storage', title: '9. Storage and privacy' },
  { id: 'boundaries', title: '10. Model boundaries' },
  { id: 'webmcp', title: '11. WebMCP reference' },
  { id: 'api', title: '12. Programmatic API' },
];

const EFFECT_LABELS: Record<EffectClass, string> = {
  read: 'Read',
  navigation: 'Navigation',
  workspace_ephemeral: 'Workspace state',
  document_metadata: 'Metadata',
  annotation_mutation: 'Annotations',
  sequence_mutation: 'Sequence',
  document_destructive: 'Destructive',
  export: 'Export',
};

const REVIEWED_TOOL_NAMES = new Set([
  'seqcraft_edit_sequence',
  'seqcraft_reverse_complement_region',
  'seqcraft_rotate_origin',
  'seqcraft_copy_region_between_documents',
  'seqcraft_stage_domestication_candidate',
  'seqcraft_restore_revision',
  'seqcraft_prepare_restriction_clone',
]);

const TOOL_REFERENCE_ROWS = ALL_SEQCRAFT_TOOLS.reduce<ToolReferenceRow[]>((rows, tool) => {
  const canonical = rows.find(row => row.tool.execute === tool.execute);
  if (canonical) {
    canonical.aliases.push(tool.name);
  } else {
    rows.push({ tool, aliases: [] });
  }
  return rows;
}, []).sort((a, b) => a.tool.name.localeCompare(b.tool.name));

const API_EXAMPLE = `import { Seq, Translation } from 'nucleotide-sequence';

const dna = new Seq('DNA').read('ATGGGTCTCTAA');
const reverseComplement = dna.reverseComplement();
const protein = Translation.translate(dna, 1);
const orfs = Translation.findOpenReadingFrames(dna, 10);`;

function executionLabel(tool: SeqCraftToolDefinition): string {
  if (REVIEWED_TOOL_NAMES.has(tool.name)) return 'Human review';
  if (tool.name === 'seqcraft_execute_actions') return 'Depends on actions';
  if (tool.effectClass === 'read') return 'Read only';
  if (tool.effectClass === 'navigation' || tool.effectClass === 'workspace_ephemeral') return 'Immediate UI state';
  if (tool.effectClass === 'export') return 'Returns artifact';
  if (tool.effectClass === 'document_destructive') return 'Explicit confirmation';
  return 'Immediate local change';
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[var(--border)] pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">{title}</h2>
      <div className="mt-4 space-y-4 text-[14px] leading-7 text-[var(--text-muted)]">{children}</div>
    </section>
  );
}

function Callout({ title, children, tone = 'neutral' }: { title: string; children: ReactNode; tone?: 'neutral' | 'warning' }) {
  return (
    <div className={`rounded-lg border p-4 ${tone === 'warning' ? 'border-amber-500/30 bg-amber-500/10' : 'border-[var(--border)] bg-[var(--panel-muted)]'}`}>
      <h3 className="text-[13px] font-semibold text-[var(--text)]">{title}</h3>
      <div className="mt-1 text-[13px] leading-6">{children}</div>
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="font-mono text-[22px] font-semibold text-[var(--accent)]">{value}</div>
      <div className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function CodeBlock({ id, code, copiedId, onCopy }: { id: string; code: string; copiedId: string | null; onCopy: (id: string, code: string) => void }) {
  const copied = copiedId === id;
  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[#091612]">
      <button
        type="button"
        onClick={() => onCopy(id, code)}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-label={copied ? 'Copied code' : 'Copy code'}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="overflow-x-auto p-4 pr-20 text-[12px] leading-6 text-[#b8e3d4]"><code>{code}</code></pre>
    </div>
  );
}

export function DocsPage() {
  const auth = useAuthenticatedUser();
  const configuredToolCount = ALL_SEQCRAFT_TOOLS.length;
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [toolQuery, setToolQuery] = useState('');
  const [effectFilter, setEffectFilter] = useState<'all' | EffectClass>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = SECTIONS.map(section => document.getElementById(section.id)).filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: [0, 1] },
    );
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const filteredTools = useMemo(() => {
    const query = toolQuery.trim().toLowerCase();
    return TOOL_REFERENCE_ROWS.filter(({ tool, aliases }) => {
      const matchesEffect = effectFilter === 'all' || tool.effectClass === effectFilter;
      const searchText = `${tool.name} ${tool.title} ${tool.description} ${aliases.join(' ')}`.toLowerCase();
      return matchesEffect && (!query || searchText.includes(query));
    });
  }, [effectFilter, toolQuery]);

  async function copyCode(id: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setCopyStatus('Code copied to clipboard.');
      window.setTimeout(() => {
        setCopiedId(null);
        setCopyStatus('');
      }, 1800);
    } catch {
      setCopyStatus('Clipboard access was unavailable. Select the code and copy it manually.');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent)] selection:text-[var(--accent-foreground)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-8">
          <Link to="/" className="flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
            <span className="grid size-8 place-items-center rounded-md bg-[var(--accent)]"><SeqCraftLogo size={19} /></span>
            <span className="text-[15px] font-semibold tracking-tight">SeqCraft technical reference</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
              <ArrowLeft size={15} /> Workspace
            </Link>
            {auth.user ? (
              <AccountMenu user={auth.user} size="compact" />
            ) : auth.status === 'checking' ? (
              <div className="size-7 animate-pulse rounded-full border border-[var(--border)] bg-[var(--panel-muted)]" aria-label="Checking account" />
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1440px] grid-cols-[230px_minmax(0,1fr)] gap-12 px-8 py-10">
        <aside aria-label="Documentation contents">
          <nav className="sticky top-24">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Contents</p>
            <ol className="space-y-0.5">
              {SECTIONS.map(section => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={activeSection === section.id ? 'location' : undefined}
                    className={`block rounded-md px-3 py-1.5 text-[12px] leading-5 transition-colors ${activeSection === section.id ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'}`}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0 max-w-[980px] pb-20">
          <div className="mb-10 border-b border-[var(--border)] pb-9">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Implementation-backed documentation</p>
            <h1 className="mt-3 max-w-3xl text-[38px] font-semibold leading-[1.12] tracking-[-0.035em]">What SeqCraft computes, stores, and asks a human to approve.</h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-muted)]">
              A precise reference for coordinate conventions, scientific models, local-data boundaries, and every registered agent tool. Where SeqCraft uses a heuristic instead of a physical model, that boundary is stated explicitly.
            </p>
            <div className="mt-7 grid grid-cols-4 gap-3">
              <Metric value={BUILTIN_ENZYMES.length} label="restriction-enzyme definitions" />
              <Metric value={CAS_NUCLEASES.length} label="CRISPR nuclease models" />
              <Metric value={configuredToolCount} label="WebMCP tool identifiers" />
              <Metric value="Local" label="sequence-data boundary" />
            </div>
          </div>

          <div className="space-y-12">
            <Section id="coordinates" title="1. Coordinates and topology">
              <p>SeqCraft stores every interval as zero-based, half-open <code className="font-mono text-[var(--text)]">[start0, end0Exclusive)</code>. The interface and agent-facing range arguments use one-based, inclusive coordinates. Conversion happens only at the boundary: <code className="font-mono text-[var(--text)]">start0 = start1 - 1</code> and <code className="font-mono text-[var(--text)]">end0Exclusive = end1</code>.</p>
              <Callout title="Circular origin rule">
                On a circular construct of length L, zero and L identify the same physical boundary. A wrapped interval is represented and operated on as two linear segments; it must not be silently reordered into a non-wrapping interval. Rotation, replacement, deletion, and feature remapping use this convention.
              </Callout>
              <p>Linear constructs reject inverted or out-of-range selections. Circular constructs permit origin-spanning selections. User-visible coordinates remain one-based inclusive in the editor, inspectors, activity log, and WebMCP inputs.</p>
            </Section>

            <Section id="restriction" title="2. Restriction and digestion">
              <p>The built-in registry currently contains <strong className="text-[var(--text)]">{BUILTIN_ENZYMES.length} enzyme definitions</strong>, including Type II and Type IIS geometries. Recognition uses IUPAC-compatible motif matching on both strands. Cut positions and overhang polarity are derived from each registry entry and normalized against linear or circular topology.</p>
              <Callout title="What the digest predicts" tone="warning">
                The result is a sequence-geometry simulation, not a reaction-yield model. It does not model buffer compatibility, methylation sensitivity, star activity, partial digestion, incubation time, enzyme concentration, or vendor-specific high-fidelity behavior. Verify the planned reaction against the current supplier protocol.
              </Callout>
            </Section>

            <Section id="primers" title="3. Primers and PCR">
              <p>Primer properties report length, GC content, molecular weight, and melting temperature. Primers from 14–20 nt use the Wallace estimate; other lengths use a nearest-neighbor estimate with the library defaults. Binding analysis searches both orientations using exact IUPAC-compatible matching.</p>
              <p>In-silico PCR pairs exact forward and reverse binding loci and supports linear and circular templates. Ambiguous multi-binding configurations are surfaced rather than collapsed into a single confident amplicon.</p>
              <Callout title="Not a primer-design oracle" tone="warning">
                SeqCraft does not currently score mismatches, 3′ mismatch severity, hairpins, self- or heterodimers, salt-dependent competition, polymerase choice, extension time, or expected yield. Treat the output as a first-pass sequence check and validate candidate primers with a dedicated thermodynamic tool.
              </Callout>
            </Section>

            <Section id="translation" title="4. Translation and ORFs">
              <p>Translation uses NCBI genetic code table 1. ORF search scans all six reading frames with a default minimum of 30 codons and maps reverse-strand results back to the canonical sequence coordinate space. Circular mode extends the search across the origin and de-duplicates equivalent hits.</p>
              <Callout title="Fixed biological assumptions" tone="warning">
                Alternative genetic codes and caller-supplied start-codon sets are not implemented. ORFs are computational candidates, not gene calls: promoters, ribosome-binding sites, transcript context, splicing, RNA editing, and expression evidence are outside the model.
              </Callout>
            </Section>

            <Section id="golden-gate" title="5. Golden Gate assembly">
              <p>Golden Gate planning uses Type IIS cut geometry, exact overhang compatibility, part orientation, and circular-product construction. Domestication searches synonymous coding changes and stages any sequence-changing candidate for review before it can be committed.</p>
              <p>Reading-frame preservation is checked for declared coding context, but biological function is not inferred. Non-coding regulatory motifs, RNA structure, codon-pair effects, expression-host codon usage, and cryptic sites may still be altered.</p>
              <Callout title="Physical assembly boundary" tone="warning">
                Overhang compatibility is necessary but not sufficient for reliable ligation. The planner does not predict overhang fidelity matrices, secondary structure, part concentration, ligase kinetics, re-cutting dynamics, or colony success rate.
              </Callout>
            </Section>

            <Section id="crispr" title="6. CRISPR and MMEJ">
              <p>The guide scanner uses the following explicit nuclease geometries:</p>
              <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead className="bg-[var(--panel-muted)] text-[var(--text)]">
                    <tr><th className="px-3 py-2 font-semibold">Nuclease</th><th className="px-3 py-2 font-semibold">PAM</th><th className="px-3 py-2 font-semibold">PAM side</th><th className="px-3 py-2 font-semibold">Spacer</th><th className="px-3 py-2 font-semibold">Cut</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {CAS_NUCLEASES.map(nuclease => (
                      <tr key={nuclease.id}><td className="px-3 py-2 font-medium text-[var(--text)]">{nuclease.id}</td><td className="px-3 py-2 font-mono">{nuclease.pamMotif}</td><td className="px-3 py-2">{nuclease.pamOrientation}</td><td className="px-3 py-2">{nuclease.spacerLengthBp} nt</td><td className="px-3 py-2">{nuclease.cleavageType}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>Guide scores combine sequence-level heuristics such as GC range and homopolymer penalties. MMEJ prediction searches local microhomology around the modeled cut and ranks deletion candidates by tract length and distance.</p>
              <Callout title="Experimental limits" tone="warning">
                Guide scores are not genome-wide off-target scores and do not include chromatin accessibility, cell type, delivery, repair-pathway state, allelic variation, or measured nuclease efficiency. MMEJ output is a hypothesis about possible junctions, not a frequency prediction.
              </Callout>
            </Section>

            <Section id="opentrons" title="7. Opentrons protocol export">
              <p>The compiler emits Opentrons Python API 2.15 protocols for planned transfers. Bulk reagents and primers receive 10% overage; template volume receives 15%. Generated code is an editable artifact and is never sent to a robot by SeqCraft.</p>
              <Callout title="Run a physical preflight" tone="warning">
                The compiler cannot verify the connected robot, deck calibration, labware definitions, pipette installation, liquid classes, viscosity, dead volume, evaporation, contamination controls, or real inventory. Review the script in Opentrons App simulation and confirm every deck slot and volume before execution.
              </Callout>
            </Section>

            <Section id="biosecurity" title="8. Biosecurity motif screen">
              <p>The local screen compares both orientations against exact signature k-mers for <strong className="text-[var(--text)]">{REGULATED_AGENTS.length} reference entries</strong>. It runs in the browser; the sequence is not uploaded to SeqCraft's backend.</p>
              <Callout title="Screening is not clearance" tone="warning">
                This compact reference set can produce both false negatives and context-free positives. It does not replace provider screening, IGSC workflows, export-control review, institutional biosafety review, or applicable law. “No local match” is not a compliance conclusion.
              </Callout>
            </Section>

            <Section id="storage" title="9. Storage and privacy">
              <div className="grid grid-cols-2 gap-3">
                <Callout title="Browser-local data">
                  Raw DNA/RNA sequences, feature annotations, primers, document revisions, constructs, and derived sequence analyses remain in memory and browser storage (OPFS/IndexedDB as available).
                </Callout>
                <Callout title="Server-side data">
                  The optional account backend handles authentication and sequence-free project metadata. It is not the persistence layer for raw constructs.
                </Callout>
              </div>
              <p>Deleting account data clears the account and synced metadata, then clears the current browser's local workspace. Local workspaces on other devices remain on those devices. Export important constructs before clearing browser data or deleting an account.</p>
            </Section>

            <Section id="boundaries" title="10. Scientific model boundaries">
              <p>SeqCraft is a design and inspection workbench. Its strongest guarantees concern deterministic sequence transforms, coordinate invariants, and explicit mutation review—not wet-lab outcome probability.</p>
              <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead className="bg-[var(--panel-muted)] text-[var(--text)]"><tr><th className="px-3 py-2 font-semibold">Area</th><th className="px-3 py-2 font-semibold">SeqCraft models</th><th className="px-3 py-2 font-semibold">Still requires external validation</th></tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    <tr><td className="px-3 py-2 font-medium text-[var(--text)]">Sequence operations</td><td className="px-3 py-2">Exact bases, topology, coordinates, revision checks</td><td className="px-3 py-2">Biological function and phenotype</td></tr>
                    <tr><td className="px-3 py-2 font-medium text-[var(--text)]">Enzymes and assembly</td><td className="px-3 py-2">Recognition, cut geometry, compatible ends</td><td className="px-3 py-2">Kinetics, fidelity, reaction yield</td></tr>
                    <tr><td className="px-3 py-2 font-medium text-[var(--text)]">Primers and guides</td><td className="px-3 py-2">Sequence heuristics and exact loci</td><td className="px-3 py-2">Genome context, structure, efficiency</td></tr>
                    <tr><td className="px-3 py-2 font-medium text-[var(--text)]">Automation</td><td className="px-3 py-2">Transfer plan and generated script</td><td className="px-3 py-2">Hardware, deck, liquid, and operator preflight</td></tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="webmcp" title="11. WebMCP tool reference">
              <p>SeqCraft configures <strong className="text-[var(--text)]">{configuredToolCount} tool identifiers</strong> through <code className="font-mono text-[var(--text)]">document.modelContext</code>. The reference below is generated from the same registry used at runtime, so names, descriptions, and effect classes do not drift into a separate hand-maintained list.</p>
              <Callout title="Human-in-the-loop contract">
                Persistent construct-altering operations marked “Human review” stage a transaction. The interface shows the proposed sequence diff, affected features, and invariant checks; only the user can apply or reject it. Metadata, annotations, navigation, exports, undo/redo, and explicitly confirmed document deletion have distinct execution policies shown below.
              </Callout>
              <div className="grid grid-cols-[minmax(0,1fr)_190px] gap-3">
                <label className="relative block">
                  <span className="sr-only">Search WebMCP tools</span>
                  <Search aria-hidden="true" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input value={toolQuery} onChange={event => setToolQuery(event.target.value)} placeholder="Search tools, aliases, or purpose" className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] pl-9 pr-3 text-[12px] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15" />
                </label>
                <label>
                  <span className="sr-only">Filter tools by effect</span>
                  <select value={effectFilter} onChange={event => setEffectFilter(event.target.value as 'all' | EffectClass)} className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 text-[12px] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15">
                    <option value="all">All effect classes</option>
                    {Object.entries(EFFECT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
              <p className="font-mono text-[11px]" aria-live="polite">{filteredTools.length} canonical tools shown · {configuredToolCount} configured identifiers including aliases</p>
              <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                <table className="w-full table-fixed border-collapse text-left text-[12px]">
                  <thead className="bg-[var(--panel-muted)] text-[var(--text)]"><tr><th className="w-[31%] px-3 py-2 font-semibold">Tool</th><th className="w-[45%] px-3 py-2 font-semibold">Purpose</th><th className="w-[24%] px-3 py-2 font-semibold">Execution</th></tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredTools.map(({ tool, aliases }) => (
                      <tr key={tool.name} className="align-top">
                        <td className="px-3 py-3"><code className="break-all font-mono text-[11px] font-medium text-[var(--accent)]">{tool.name}</code>{aliases.length > 0 && <div className="mt-1 break-all text-[10px] leading-4 text-[var(--text-muted)]">Aliases: {aliases.join(', ')}</div>}</td>
                        <td className="px-3 py-3 leading-5">{tool.description}</td>
                        <td className="px-3 py-3"><span className="block font-medium text-[var(--text)]">{executionLabel(tool)}</span><span className="mt-0.5 block text-[10px]">{EFFECT_LABELS[tool.effectClass]}</span></td>
                      </tr>
                    ))}
                    {filteredTools.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-[var(--text-muted)]">No tools match this search and effect filter.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="api" title="12. Programmatic API">
              <p>SeqCraft's scientific wrappers use the installed <code className="font-mono text-[var(--text)]">nucleotide-sequence</code> package. The underlying API constructs a typed sequence with <code className="font-mono text-[var(--text)]">new Seq('DNA').read(...)</code> and passes that sequence object to translation helpers.</p>
              <CodeBlock id="api-example" code={API_EXAMPLE} copiedId={copiedId} onCopy={copyCode} />
              <p className="sr-only" aria-live="polite">{copyStatus}</p>
              <p>For agents, prefer the registered WebMCP tools over reaching into internal modules. Tool schemas, availability checks, structured errors, activity records, abort signals, and mutation governance are enforced at that boundary.</p>
            </Section>
          </div>
        </article>
      </main>
    </div>
  );
}
