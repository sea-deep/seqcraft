import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, Dna, LockKeyhole, MousePointer2, ScanLine, TestTube2 } from 'lucide-react';

const workflow = [
  ['Inspect', 'Understand the active construct and exact selection.'],
  ['Analyze', 'Run deterministic restriction, PCR, ORF, and comparison tools.'],
  ['Navigate', 'Move the shared map, sequence view, and inspector together.'],
  ['Propose', 'Stage scientific changes for human review.'],
];

export function MarketingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent)] selection:text-white">
      <nav className="h-16 border-b border-[var(--border)] bg-[var(--panel)]/92 backdrop-blur sticky top-0 z-50">
        <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-[var(--accent)] font-semibold text-lg tracking-[-0.02em]">
            <span className="size-8 rounded-md bg-[var(--accent-soft)] grid place-items-center"><Dna size={18} /></span>
            SeqCraft
          </Link>
          <div className="flex gap-3 text-[13px] font-medium items-center">
            <Link to="/docs" className="hidden sm:inline-flex text-[var(--text-muted)] hover:text-[var(--text)] px-3 py-2">Documentation</Link>
            <Link to="/auth" className="px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-muted)] transition-colors">Sign in</Link>
            <Link to="/dashboard" className="px-4 py-2 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors">Open workspace</Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="scientific-grid border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent)] mb-6">
                <span className="size-1.5 bg-[var(--accent)]" /> Agent-native molecular biology
              </div>
              <h1 className="text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold tracking-[-0.04em] leading-[1.05] text-balance">
                Design DNA with an agent that understands the map.
              </h1>
              <p className="mt-7 text-[17px] leading-7 text-[var(--text-secondary)] max-w-2xl">
                Inspect plasmids, simulate PCR and restriction digests, compare constructs, and prepare cloning proposals in one exact, private workspace. Every agent result stays visible and verifiable.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/dashboard" className="h-11 inline-flex items-center gap-2 px-5 rounded-md bg-[var(--accent)] text-white text-[14px] font-medium hover:bg-[var(--accent-hover)] transition-colors">
                  Launch SeqCraft <ArrowRight size={17} />
                </Link>
                <Link to="/docs" className="h-11 inline-flex items-center gap-2 px-5 rounded-md border border-[var(--border)] bg-[var(--panel)] text-[14px] font-medium hover:bg-[var(--panel-muted)] transition-colors">
                  <BookOpen size={16} /> Read the methods
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[var(--text-muted)]">
                {['No account required', 'Sequences stay in-browser', 'Persistent agent changes need approval'].map(item => <span key={item} className="flex items-center gap-1.5"><Check size={13} className="text-[var(--success)]" />{item}</span>)}
              </div>
            </div>

            <div className="bg-[var(--panel)] border border-[var(--border-strong)] rounded-lg overflow-hidden shadow-[0_24px_70px_rgb(15_45_40/0.10)]">
              <div className="h-10 border-b border-[var(--border)] bg-[var(--panel-muted)] px-4 flex items-center justify-between">
                <span className="font-mono text-[11px] text-[var(--text-muted)]">AGENT WORKFLOW / pUC19</span>
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--success)]"><span className="size-1.5 rounded-full bg-[var(--success)]" />17 tools ready</span>
              </div>
              <div className="p-5">
                <div className="font-mono text-[12px] leading-5 bg-[var(--bg)] border border-[var(--border)] rounded-md p-3 text-[var(--text-secondary)]">
                  “Find unique EcoRI/HindIII sites, simulate the digest, then show AmpR on the map.”
                </div>
                <div className="mt-5 grid gap-1">
                  {workflow.map(([title, detail], index) => (
                    <div key={title} className="grid grid-cols-[28px_74px_1fr] items-start gap-2 py-3 border-b border-[var(--border)] last:border-0">
                      <span className="font-mono text-[11px] text-[var(--accent)]">0{index + 1}</span>
                      <span className="text-[13px] font-medium">{title}</span>
                      <span className="text-[12px] leading-5 text-[var(--text-muted)]">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--panel-muted)] font-mono text-[11px] text-[var(--text-muted)] flex justify-between">
                <span>Coordinates: 0-based half-open</span><span>Verified in-browser</span>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent)] mb-3">One coherent workbench</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em]">Scientific depth without giving up control.</h2>
          </div>
          <div className="grid md:grid-cols-3 border-y border-[var(--border)]">
            <Feature icon={<ScanLine size={20} />} title="Exact visualization" text="Virtualized sequence tracks and synchronized 2D/3D construct maps use canonical coordinates—not rounded display geometry." />
            <Feature icon={<TestTube2 size={20} />} title="Deterministic workflows" text="Restriction chemistry, primers, PCR, ORFs, comparison, and directional cloning produce structured, testable results." />
            <Feature icon={<LockKeyhole size={20} />} title="Private by architecture" text="Raw sequences remain in browser storage. The optional account service receives only identity and sequence-free metadata." />
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--panel)]">
          <div className="max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-start gap-4">
              <span className="size-11 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] grid place-items-center shrink-0"><MousePointer2 size={20} /></span>
              <div><h2 className="text-xl font-semibold">The agent operates the workspace you can see.</h2><p className="text-[14px] text-[var(--text-muted)] mt-1 max-w-2xl">No hidden chatbot state: selections, camera focus, tool activity, calculations, and approval proposals appear in the same interface used manually.</p></div>
            </div>
            <Link to="/dashboard" className="shrink-0 inline-flex items-center gap-2 text-[14px] font-medium text-[var(--accent)]">Launch SeqCraft <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-8 text-[12px] text-[var(--text-muted)] flex justify-between gap-4">
        <span>© {new Date().getFullYear()} SeqCraft</span><span className="font-mono">Local science · optional cloud identity</span>
      </footer>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="py-8 md:px-8 first:pl-0 last:pr-0 border-b md:border-b-0 md:border-r border-[var(--border)] last:border-0">
      <div className="size-9 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] grid place-items-center mb-5">{icon}</div>
      <h3 className="font-semibold text-[16px] mb-2">{title}</h3>
      <p className="text-[13px] leading-6 text-[var(--text-muted)]">{text}</p>
    </article>
  );
}
