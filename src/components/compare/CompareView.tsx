import { useEffect, useRef, useState } from 'react';
import { Download, FileJson, GitCompareArrows, LoaderCircle, PanelRight } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SequenceDocument } from '../../domain/document';
import type { BaseDifference, SequenceDiffResult } from '../../domain/sequence-diff';
import type { CircularDiffGeometry } from '../../geometry/circular-diff-geometry';
import { circularDiffGeometryToSvg } from '../../export/circular-diff-svg';
import { sequenceDiffToJson } from '../../export/sequence-diff-json';
import { useWorkspaceStore } from '../../state/workspace-store';
import { compareSequenceDocuments } from '../../application/sequence-diff';
import { CircularDiffMap2D } from './CircularDiffMap2D';
import { SequenceDiffReport } from './SequenceDiffReport';
import { Skeleton } from '../ui/skeleton';

const BASES_PER_ROW = 80;

type ComparisonState =
  | { status: 'idle' }
  | { status: 'error'; requestKey: string; message: string }
  | { status: 'ready'; requestKey: string; result: SequenceDiffResult; geometry: CircularDiffGeometry | null };

function differenceLabel(difference: BaseDifference): string {
  if (difference.kind === 'substitution') return `${difference.referenceBases} → ${difference.queryBases}`;
  if (difference.kind === 'insertion') return `+${difference.queryBases}`;
  return `−${difference.referenceBases}`;
}

function downloadSvg(geometry: CircularDiffGeometry, referenceName: string, queryName: string): void {
  const blob = new Blob([circularDiffGeometryToSvg(geometry)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${referenceName}-vs-${queryName}-canonical-diff.svg`.replaceAll(/[^a-z0-9._-]+/gi, '-');
  link.click();
  URL.revokeObjectURL(url);
}

function downloadJson(result: SequenceDiffResult, referenceName: string, queryName: string): void {
  const blob = new Blob([sequenceDiffToJson(result)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${referenceName}-vs-${queryName}-canonical-diff.json`.replaceAll(/[^a-z0-9._-]+/gi, '-');
  link.click();
  URL.revokeObjectURL(url);
}

function AlignmentRows({ result }: { result: SequenceDiffResult }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(result.alignedReference.length / BASES_PER_ROW);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual intentionally owns an imperative measurement cache.
  const virtualizer = useVirtualizer({ count: rowCount, getScrollElement: () => scrollRef.current, estimateSize: () => 62, overscan: 8 });
  return (
    <div ref={scrollRef} className="h-full overflow-auto p-3 font-mono text-[12px] leading-5">
      <div className="relative w-max min-w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(row => {
          const start = row.index * BASES_PER_ROW;
          const referenceChunk = result.alignedReference.slice(start, start + BASES_PER_ROW);
          const queryChunk = result.alignedQuery.slice(start, start + BASES_PER_ROW);
          return (
            <div key={start} className="absolute left-0 top-0 w-full" style={{ transform: `translateY(${row.start}px)` }}>
              <div className="flex"><span className="w-[82px] shrink-0 text-[var(--text-muted)]">REF {start + 1}</span><span>{referenceChunk.split('').map((base, index) => <span key={index} className={base !== queryChunk[index] ? 'bg-[var(--selection-bg)] text-[var(--accent)]' : ''}>{base}</span>)}</span></div>
              <div className="flex"><span className="w-[82px] shrink-0 text-[var(--text-muted)]">QRY</span><span>{queryChunk.split('').map((base, index) => <span key={index} className={base !== referenceChunk[index] ? 'bg-[var(--selection-bg)] text-[var(--accent)]' : ''}>{base}</span>)}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompareView({ reference, documents }: { reference: SequenceDocument; documents: SequenceDocument[] }) {
  const options = documents.filter(document => document.id !== reference.id && document.storageMode === 'memory');
  const [queryDocumentId, setQueryDocumentId] = useState(options[0]?.id ?? '');
  const [view, setView] = useState<'report' | 'circular' | 'alignment'>('report');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [state, setState] = useState<ComparisonState>({ status: 'idle' });
  const query = options.find(document => document.id === queryDocumentId);
  const requestKey = query ? `${reference.id}:${reference.version}:${query.id}:${query.version}` : '';
  const setSelection = useWorkspaceStore(store => store.setSelection);
  const setActiveView = useWorkspaceStore(store => store.setActiveView);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    void compareSequenceDocuments(reference, query, { maxEditDistance: 4_096, includeUnchangedFeatures: true }, { width: 760, height: 640, maxLabels: 30 }, controller.signal)
      .then(({ result, geometry }) => setState({ status: 'ready', requestKey, result, geometry }))
      .catch(error => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setState({ status: 'error', requestKey, message: error instanceof Error ? error.message : String(error) });
      });
    return () => controller.abort();
  }, [query, reference, requestKey]);

  const focusDifference = (differenceId: string) => {
    if (state.status !== 'ready') return;
    const difference = state.result.differences.find(item => item.id === differenceId);
    if (!difference) return;
    const segments = difference.referenceOriginalSegments;
    const zeroSegment = segments.find(segment => segment.start0 === 0);
    const endSegment = segments.find(segment => segment.end0Exclusive === reference.length);
    if (reference.topology === 'circular' && zeroSegment && endSegment && segments.length > 1) {
      setSelection(reference.id, endSegment.start0, zeroSegment.end0Exclusive);
    } else {
      const segment = segments[0];
      const start0 = Math.min(segment?.start0 ?? difference.referenceStart0, Math.max(0, reference.length - 1));
      const end0Exclusive = Math.max(start0 + 1, Math.min(reference.length, segment?.end0Exclusive ?? difference.referenceEnd0Exclusive));
      setSelection(reference.id, start0, end0Exclusive);
    }
    setActiveView('sequence');
  };

  const ready = state.status === 'ready' && state.requestKey === requestKey ? state : null;
  const error = state.status === 'error' && state.requestKey === requestKey ? state : null;
  const loading = Boolean(query && !ready && !error);
  const canShowCircular = Boolean(ready?.geometry);
  const changedFeatureCount = ready?.result.featureDifferences.filter(difference => difference.kind !== 'unchanged').length ?? 0;
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg)] font-ui text-[12px]">
      <div className="flex min-h-[48px] shrink-0 items-center gap-2 overflow-x-auto border-b border-[var(--border)] bg-[var(--panel)] px-3 scrollbar-none">
        <GitCompareArrows size={15} className="shrink-0 text-[var(--accent)]" />
        <span className="max-w-[260px] shrink-0 truncate font-medium" title={reference.name}>{reference.name}</span>
        <span className="shrink-0 text-[var(--text-muted)]">with</span>
        <select aria-label="Sequence to compare" value={queryDocumentId} onChange={event => { setQueryDocumentId(event.target.value); setView('report'); }} className="h-[30px] min-w-[150px] max-w-[260px] flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 outline-none focus:border-[var(--accent)]"><option value="">Choose a document</option>{options.map(document => <option key={document.id} value={document.id}>{document.name}</option>)}</select>
        {ready && view !== 'report' && <span className="shrink-0 rounded bg-[var(--panel-muted)] px-2 py-1 font-mono text-[11px] text-[var(--text-secondary)]">{ready.result.identityPercent.toFixed(1)}%</span>}
        {ready && <div className="ml-auto flex shrink-0 rounded-md border border-[var(--border)] p-0.5"><button onClick={() => setView('report')} className={`h-7 rounded px-2.5 ${view === 'report' ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>Summary</button>{canShowCircular && <button onClick={() => setView('circular')} className={`h-7 rounded px-2.5 ${view === 'circular' ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>Map</button>}<button onClick={() => setView('alignment')} className={`h-7 rounded px-2.5 ${view === 'alignment' ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>Alignment</button></div>}
        {view === 'circular' && ready?.geometry && query && <button title="Export circular diff as SVG" onClick={() => downloadSvg(ready.geometry!, reference.name, query.name)} className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 hover:bg-[var(--panel-muted)]"><Download size={13} />SVG</button>}
        {ready && query && <button title="Export structured comparison as JSON" onClick={() => downloadJson(ready.result, reference.name, query.name)} className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 hover:bg-[var(--panel-muted)]"><FileJson size={13} />JSON</button>}
        {ready && view !== 'report' && (
          <button
            type="button"
            title={sidebarOpen ? "Hide differences sidebar" : "Show differences sidebar"}
            onClick={() => setSidebarOpen(s => !s)}
            className={`flex h-[30px] shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 transition-colors ${sidebarOpen ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium' : 'text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]'}`}
          >
            <PanelRight size={13} />
            <span className="text-[11px]">{sidebarOpen ? 'Hide Panel' : 'Differences'}</span>
          </button>
        )}
      </div>
      {!query && <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">Import or open another sequence to compare.</div>}
      {loading && (
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[var(--bg-editor)]">
          <div className="mx-auto max-w-5xl space-y-5">
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
              <LoaderCircle size={15} className="animate-spin text-[var(--accent)]" />
              <span>Canonicalizing and comparing in background worker…</span>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 animate-pulse space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 animate-pulse space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="grid sm:grid-cols-3 gap-2">
                <Skeleton className="h-14 w-full rounded-md" />
                <Skeleton className="h-14 w-full rounded-md" />
                <Skeleton className="h-14 w-full rounded-md" />
              </div>
            </div>
          </div>
        </div>
      )}
      {error && <div className="m-4 rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4 text-[var(--danger)]">Comparison failed: {error.message}</div>}
      {ready && query && view === 'report' && <main className="min-h-0 flex-1 overflow-hidden"><SequenceDiffReport result={ready.result} onSelectDifference={focusDifference} /></main>}
      {ready && query && view !== 'report' && (
        <div className={`grid min-h-0 flex-1 ${sidebarOpen ? 'grid-cols-[minmax(0,1fr)_280px]' : 'grid-cols-[1fr]'}`}>
          <main className="min-h-0 overflow-hidden bg-[var(--bg-editor)]">{view === 'circular' && ready.geometry ? <CircularDiffMap2D geometry={ready.geometry} onSelectDifference={focusDifference} /> : <AlignmentRows result={ready.result} />}</main>
          {sidebarOpen && (
          <aside className="min-h-0 overflow-auto border-l border-[var(--border)] bg-[var(--panel)]">
            <section><div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--panel-muted)] px-3 py-2 font-semibold">Base differences</div>{ready.result.differences.length === 0 && <p className="p-3 text-[var(--text-muted)]">No base differences after canonical orientation.</p>}{ready.result.differences.map(difference => {
              const badgeColor = difference.kind === 'insertion' ? 'text-[var(--success)]' : difference.kind === 'deletion' ? 'text-[var(--danger)]' : 'text-[var(--warning)]';
              return (
                <button key={difference.id} onClick={() => focusDifference(difference.id)} className="block w-full border-b border-[var(--border)] px-3 py-2 text-left hover:bg-[var(--panel-muted)] transition-colors">
                  <span className="flex items-center justify-between">
                    <span className={`font-semibold capitalize text-[11px] ${badgeColor}`}>{difference.kind}</span>
                    <span className="max-w-[150px] truncate font-mono text-[11px] font-medium text-[var(--text)]">{differenceLabel(difference)}</span>
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">Canonical ref {difference.referenceStart0 + 1}–{Math.max(difference.referenceStart0 + 1, difference.referenceEnd0Exclusive)}</span>
                </button>
              );
            })}</section>
            {changedFeatureCount > 0 && <section><div className="sticky top-0 border-y border-[var(--border)] bg-[var(--panel-muted)] px-3 py-2 font-semibold">Annotation differences</div>{ready.result.featureDifferences.filter(difference => difference.kind !== 'unchanged').map(difference => <div key={difference.id} className="border-b border-[var(--border)] px-3 py-2"><div className="flex justify-between gap-2"><span className="font-medium">{difference.referenceFeature?.name ?? difference.queryFeature?.name}</span><span className="capitalize text-[var(--text-muted)]">{difference.kind}</span></div>{difference.changes.length > 0 && <div className="mt-1 text-[11px] text-[var(--text-muted)]">Changed: {difference.changes.join(', ')}</div>}</div>)}</section>}
            {ready.result.proteinConsequences.length > 0 && <section><div className="sticky top-0 border-y border-[var(--border)] bg-[var(--panel-muted)] px-3 py-2 font-semibold">CDS consequences</div>{ready.result.proteinConsequences.map(consequence => <div key={consequence.id} className="border-b border-[var(--border)] px-3 py-2"><div className="font-medium">{consequence.featureName}</div><div className="mt-1 flex flex-wrap gap-1">{consequence.kinds.map(kind => <span key={kind} className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[11px] text-[var(--accent)]">{kind.replaceAll('_', ' ')}</span>)}</div>{consequence.firstAffectedAminoAcid1 && <div className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">AA {consequence.firstAffectedAminoAcid1}: {consequence.referenceAminoAcids || '∅'} → {consequence.queryAminoAcids || '∅'}</div>}</div>)}</section>}
            <section className="p-3 text-[11px] leading-4 text-[var(--text-muted)]"><div>Reference: {ready.result.reference.orientation} · rotation {ready.result.reference.rotation0}</div><div>Query: {ready.result.query.orientation} · rotation {ready.result.query.rotation0}</div><div>Coordinates are canonical 0-based half-open internally; UI positions are 1-based.</div></section>
          </aside>
          )}
        </div>
      )}
    </div>
  );
}
