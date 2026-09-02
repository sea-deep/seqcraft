import { getMemorySequence } from '../../utils/document-utils';
import { useMemo, useState } from 'react';
import type { DigestResult } from '../../domain/digest';
import type { SequenceDocument } from '../../domain/document';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { simulateRestrictionDigest } from '../../scientific/digest';
import { analyzeRestrictionSites, getEndType } from '../../scientific/restriction-analysis';
import { useWorkspaceStore } from '../../state/workspace-store';

type CutterFilter = 'all' | 'unique' | 'double' | 'noncutters';

export function EnzymesView({ document }: { document: SequenceDocument }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CutterFilter>('all');
  const [selectedEnzymeIds, setSelectedEnzymeIds] = useState<string[]>([]);
  const [digestResult, setDigestResult] = useState<DigestResult | null>(null);
  const selectedRestrictionSiteId = useWorkspaceStore(state => state.selectedRestrictionSiteId);
  const selectRestrictionSite = useWorkspaceStore(state => state.selectRestrictionSite);
  const setActiveView = useWorkspaceStore(state => state.setActiveView);
  const sites = useMemo(() => analyzeRestrictionSites(getMemorySequence(document).raw, document.topology, BUILTIN_ENZYMES), [document]);
  const siteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const site of sites) counts.set(site.enzymeId, (counts.get(site.enzymeId) ?? 0) + 1);
    return counts;
  }, [sites]);
  const enzymes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return BUILTIN_ENZYMES.filter(enzyme => {
      const count = siteCounts.get(enzyme.id) ?? 0;
      const filterMatch = filter === 'all' || (filter === 'unique' && count === 1) || (filter === 'double' && count === 2) || (filter === 'noncutters' && count === 0);
      return filterMatch && (!normalized || enzyme.name.toLowerCase().includes(normalized) || enzyme.recognitionSequence.toLowerCase().includes(normalized));
    });
  }, [filter, query, siteCounts]);

  const toggleEnzyme = (enzymeId: string) => {
    setSelectedEnzymeIds(current => current.includes(enzymeId) ? current.filter(id => id !== enzymeId) : [...current, enzymeId]);
    setDigestResult(null);
  };
  const digest = () => {
    if (selectedEnzymeIds.length === 0) {
      setDigestResult(null);
      return;
    }
    setDigestResult(simulateRestrictionDigest({ sequence: getMemorySequence(document).raw, topology: document.topology, restrictionSites: sites, selectedEnzymeIds }));
  };

  return (
    <div className="h-full overflow-auto bg-[var(--bg)] font-ui text-[12px]">
      <div className="sticky top-0 z-10 flex min-h-[44px] items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-3">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find enzyme or recognition sequence" className="h-[30px] min-w-[220px] flex-1 max-w-[360px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 outline-none focus:border-[var(--accent)]" />
        <div className="flex rounded-md border border-[var(--border)] bg-[var(--bg)] p-0.5">{(['all', 'unique', 'double', 'noncutters'] as CutterFilter[]).map(value => <button key={value} onClick={() => setFilter(value)} className={`h-[25px] rounded px-2 capitalize ${filter === value ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>{value === 'double' ? '2 cutters' : value}</button>)}</div>
        <button onClick={digest} className="ml-auto h-[30px] rounded-md bg-[var(--accent)] px-3 font-medium text-white">Digest selected ({selectedEnzymeIds.length})</button>
      </div>
      <table className="w-full border-collapse">
        <thead className="bg-[var(--panel-muted)] text-left text-[11px] text-[var(--text-muted)]"><tr><th className="w-[38px]" /><th className="px-3 py-2 font-medium">Enzyme</th><th className="px-3 py-2 font-medium">Recognition</th><th className="px-3 py-2 font-medium">End</th><th className="px-3 py-2 font-medium">Sites</th><th className="px-3 py-2 font-medium">Cut coordinates</th></tr></thead>
        <tbody>{enzymes.map(enzyme => {
          const enzymeSites = sites.filter(site => site.enzymeId === enzyme.id);
          return (
            <tr key={enzyme.id} className="border-b border-[var(--border)] hover:bg-[var(--panel-muted)]">
              <td className="pl-3"><input type="checkbox" checked={selectedEnzymeIds.includes(enzyme.id)} onChange={() => toggleEnzyme(enzyme.id)} aria-label={`Select ${enzyme.name} for digest`} /></td>
              <td className="px-3 py-2 font-semibold">{enzyme.name}</td><td className="px-3 py-2 font-mono">{enzyme.recognitionSequence}</td><td className="px-3 py-2">{getEndType(enzyme)}</td><td className="px-3 py-2 font-mono">{enzymeSites.length}</td>
              <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{enzymeSites.map(site => <button key={site.id} onClick={() => { selectRestrictionSite(site.id); setActiveView('sequence'); }} className={`rounded border px-1.5 py-0.5 font-mono ${selectedRestrictionSiteId === site.id ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--panel)]'}`}>{site.forwardCut0 + 1}</button>)}{enzymeSites.length === 0 && <span className="text-[var(--text-muted)]">—</span>}</div></td>
            </tr>
          );
        })}</tbody>
      </table>

      {selectedEnzymeIds.length === 0 && <div className="p-4 text-[var(--text-muted)]">Select enzymes in the first column, then simulate the digest.</div>}
      {selectedEnzymeIds.length > 0 && !digestResult && <div className="p-4 text-[var(--text-muted)]">Ready to digest with {selectedEnzymeIds.map(id => BUILTIN_ENZYMES.find(enzyme => enzyme.id === id)?.name).join(', ')}.</div>}
      {digestResult && (
        <section className="m-3 border border-[var(--border)] bg-[var(--panel)]">
          <div className="border-b border-[var(--border)] px-3 py-2 font-semibold">Digest result · {digestResult.cuts.length} cuts · {digestResult.fragments.length} fragments</div>
          <div className="divide-y divide-[var(--border)]">{[...digestResult.fragments].sort((a, b) => b.lengthBp - a.lengthBp).map(fragment => <div key={fragment.id} className="grid grid-cols-[100px_1fr_1fr] gap-3 px-3 py-2"><span className="font-mono font-semibold">{fragment.lengthBp.toLocaleString()} bp</span><span className="text-[var(--text-secondary)]">Left: {fragment.leftEnd.type}{fragment.leftEnd.sequence ? ` ${fragment.leftEnd.sequence}` : ''}</span><span className="text-[var(--text-secondary)]">Right: {fragment.rightEnd.type}{fragment.rightEnd.sequence ? ` ${fragment.rightEnd.sequence}` : ''}</span></div>)}</div>
        </section>
      )}
    </div>
  );
}
