import { useMemo, useState } from 'react';
import { Edit3, Plus, ScanSearch, Search, Trash2 } from 'lucide-react';
import type { SequenceDocument } from '../../domain/document';
import { getFeatureLength } from '../../domain/feature';
import { getFeatureColor } from '../../domain/feature-colors';
import { useWorkspaceStore } from '../../state/workspace-store';
import { FeatureDialog } from './FeatureDialog';
import { KnownFeatureDialog } from './KnownFeatureDialog';

export function FeaturesView({ document }: { document: SequenceDocument }) {
  const [query, setQuery] = useState('');
  const [dialogFeatureId, setDialogFeatureId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const selection = useWorkspaceStore(state => state.selection);
  const selectedFeatureId = useWorkspaceStore(state => state.selectedFeatureId);
  const selectDocumentFeature = useWorkspaceStore(state => state.selectDocumentFeature);
  const deleteFeature = useWorkspaceStore(state => state.deleteFeature);
  const setActiveView = useWorkspaceStore(state => state.setActiveView);
  const activeSelection = selection?.documentId === document.id ? selection : null;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return document.features
      .filter(feature => feature.type !== 'source')
      .filter(feature => !normalized || feature.name.toLowerCase().includes(normalized) || feature.type.toLowerCase().includes(normalized));
  }, [document.features, query]);
  const dialogFeature = document.features.find(feature => feature.id === dialogFeatureId);

  return (
    <div className="h-full overflow-auto bg-[var(--bg)] font-ui text-[12px]">
      <div className="sticky top-0 z-10 flex h-[44px] items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-3">
        <div className="relative min-w-[180px] flex-1 max-w-[360px]">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter features" className="h-[30px] w-full rounded-md border border-[var(--border)] bg-[var(--bg)] pl-7 pr-2 outline-none focus:border-[var(--accent)]" />
        </div>
        <button onClick={() => setScanning(true)} className="ml-auto flex h-[30px] items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 font-medium hover:bg-[var(--panel-muted)]"><ScanSearch size={14} />Scan known</button>
        {activeSelection ? (
          <button onClick={() => setCreating(true)} className="flex h-[30px] items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] shadow-sm transition-colors cursor-pointer"><Plus size={14} />Add from selection</button>
        ) : (
          <button onClick={() => setActiveView('sequence')} className="h-[30px] rounded-md border border-[var(--border)] px-3 text-[var(--text-secondary)] hover:bg-[var(--panel-muted)]">Select bases to add feature</button>
        )}
      </div>

      <table className="w-full border-collapse">
        <thead className="sticky top-[44px] z-[5] bg-[var(--panel-muted)] text-left text-[11px] text-[var(--text-muted)]">
          <tr><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Range</th><th className="px-3 py-2 font-medium">Strand</th><th className="px-3 py-2 font-medium">Length</th><th className="w-[76px]" /></tr>
        </thead>
        <tbody>
          {filtered.map(feature => {
            const start0 = Math.min(...feature.segments.map(segment => segment.start0));
            const end0Exclusive = Math.max(...feature.segments.map(segment => segment.end0Exclusive));
            const selected = selectedFeatureId === feature.id;
            return (
              <tr key={feature.id} onClick={() => selectDocumentFeature(document.id, feature.id)} className={`cursor-pointer border-b border-[var(--border)] hover:bg-[var(--panel-muted)] ${selected ? 'bg-[var(--accent-soft)]' : ''}`}>
                <td className="px-3 py-2 font-medium"><span className="mr-2 inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: getFeatureColor(feature.type) }} />{feature.name}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">{feature.type}</td>
                <td className="px-3 py-2 font-mono">{start0 + 1}–{end0Exclusive}</td>
                <td className="px-3 py-2">{feature.strand === 1 ? 'Forward' : 'Reverse'}</td>
                <td className="px-3 py-2 font-mono">{getFeatureLength(feature)} bp</td>
                <td className="px-2 py-1">
                  <div className="flex justify-end">
                    <button aria-label={`Edit ${feature.name}`} onClick={event => { event.stopPropagation(); setDialogFeatureId(feature.id); }} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)]"><Edit3 size={14} /></button>
                    <button aria-label={`Delete ${feature.name}`} onClick={event => { event.stopPropagation(); if (window.confirm(`Delete feature “${feature.name}”?`)) deleteFeature(document.id, feature.id); }} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && <div className="p-8 text-center text-[var(--text-muted)]">{query ? 'No matching features.' : 'No annotations yet. Select bases in Sequence to add one.'}</div>}

      {activeSelection && creating && <FeatureDialog document={document} selection={activeSelection} open onOpenChange={setCreating} />}
      {dialogFeature && dialogFeatureId && <FeatureDialog document={document} feature={dialogFeature} open onOpenChange={open => !open && setDialogFeatureId(null)} />}
      {scanning && <KnownFeatureDialog document={document} onClose={() => setScanning(false)} />}
    </div>
  );
}
