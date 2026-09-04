import { getMemorySequence } from '../../utils/document-utils';
import { useMemo, useState } from 'react';
import { Search, Bot, Scissors } from 'lucide-react';
import type { DigestResult } from '../../domain/digest';
import type { SequenceDocument } from '../../domain/document';
import type { RestrictionCategory } from '../../domain/restriction';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { simulateRestrictionDigest } from '../../scientific/digest';
import { analyzeRestrictionSites, getEndType } from '../../scientific/restriction-analysis';
import { useWorkspaceStore } from '../../state/workspace-store';
import { OpentronsExportDialog } from '../tools/OpentronsExportDialog';

type CutterFilter = 'all' | 'unique' | 'double' | 'noncutters';
type CategoryFilter = 'all' | RestrictionCategory;

export function EnzymesView({ document }: { document: SequenceDocument }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CutterFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedEnzymeIds, setSelectedEnzymeIds] = useState<string[]>([]);
  const [digestResult, setDigestResult] = useState<DigestResult | null>(null);
  const [opentronsOpen, setOpentronsOpen] = useState(false);

  const selectedRestrictionSiteId = useWorkspaceStore(state => state.selectedRestrictionSiteId);
  const selectRestrictionSite = useWorkspaceStore(state => state.selectRestrictionSite);
  const setActiveView = useWorkspaceStore(state => state.setActiveView);

  const isMemory = document.storageMode === 'memory' && Boolean(document.sequence);

  const sites = useMemo(() => {
    if (!isMemory) return [];
    return analyzeRestrictionSites(getMemorySequence(document).raw, document.topology, BUILTIN_ENZYMES);
  }, [document, isMemory]);

  const siteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const site of sites) counts.set(site.enzymeId, (counts.get(site.enzymeId) ?? 0) + 1);
    return counts;
  }, [sites]);

  const enzymes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return BUILTIN_ENZYMES.filter(enzyme => {
      const count = siteCounts.get(enzyme.id) ?? 0;
      const filterMatch =
        filter === 'all' ||
        (filter === 'unique' && count === 1) ||
        (filter === 'double' && count === 2) ||
        (filter === 'noncutters' && count === 0);

      const categoryMatch =
        category === 'all' ||
        (category === 'common_cloning' && enzyme.isCommon) ||
        enzyme.category === category;

      const textMatch =
        !normalized ||
        enzyme.name.toLowerCase().includes(normalized) ||
        enzyme.recognitionSequence.toLowerCase().includes(normalized) ||
        (enzyme.aliases && enzyme.aliases.some(a => a.toLowerCase().includes(normalized)));

      return filterMatch && categoryMatch && textMatch;
    });
  }, [category, filter, query, siteCounts]);

  const toggleEnzyme = (enzymeId: string) => {
    setSelectedEnzymeIds(current =>
      current.includes(enzymeId) ? current.filter(id => id !== enzymeId) : [...current, enzymeId]
    );
    setDigestResult(null);
  };

  const digest = () => {
    if (!isMemory) return;
    if (selectedEnzymeIds.length === 0) {
      setDigestResult(null);
      return;
    }
    setDigestResult(
      simulateRestrictionDigest({
        sequence: getMemorySequence(document).raw,
        topology: document.topology,
        restrictionSites: sites,
        selectedEnzymeIds
      })
    );
  };

  return (
    <div className="h-full overflow-auto bg-[var(--bg)] font-ui text-[12px] text-[var(--text)]">
      {/* Top Header Control Bar */}
      <div className="sticky top-0 z-10 flex flex-wrap min-h-[44px] items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-1.5">
        <div className="relative flex-1 max-w-[320px] min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <input
            aria-label="Search restriction enzymes"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search 75+ enzymes, aliases, motifs..."
            className="h-[30px] w-full rounded-md border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-[12px] outline-none focus:border-[var(--accent)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1" role="group" aria-label="Enzyme class">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Class</span>
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--bg)] p-0.5">
            {[
              { id: 'all', label: 'Any' },
              { id: 'common_cloning', label: 'Common' },
              { id: 'type_iis', label: 'Type IIS' },
              { id: 'rare_cutter', label: '8-Cutters' },
              { id: 'diagnostic_4cutter', label: '4-Cutters' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCategory(item.id as CategoryFilter)}
                aria-pressed={category === item.id}
                className={`h-[25px] rounded px-2 text-[11px] font-medium transition-colors cursor-pointer ${
                  category === item.id
                    ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cutter Count Filter */}
        <div className="flex items-center gap-1" role="group" aria-label="Recognition site count">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Sites</span>
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--bg)] p-0.5">
            {([
              { id: 'all', label: 'Any' },
              { id: 'unique', label: 'One' },
              { id: 'double', label: 'Two' },
              { id: 'noncutters', label: 'None' }
            ] as Array<{ id: CutterFilter; label: string }>).map(item => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={`h-[25px] rounded px-2 text-[11px] transition-colors cursor-pointer ${
                  filter === item.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={digest}
          disabled={selectedEnzymeIds.length === 0}
          className="ml-auto h-[30px] rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <Scissors size={13} /> Digest selected ({selectedEnzymeIds.length})
        </button>
      </div>

      {/* Enzyme Table */}
      <table className="w-full border-collapse">
        <thead className="bg-[var(--panel-muted)] text-left text-[11px] font-medium text-[var(--text-muted)] border-b border-[var(--border)]">
          <tr>
            <th className="w-[38px]" />
            <th className="px-3 py-2 font-medium">Enzyme</th>
            <th className="px-3 py-2 font-medium">Recognition Motif</th>
            <th className="px-3 py-2 font-medium">Overhang / End</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Sites</th>
            <th className="px-3 py-2 font-medium">Cut Coordinates</th>
          </tr>
        </thead>
        <tbody>
          {enzymes.map(enzyme => {
            const enzymeSites = sites.filter(site => site.enzymeId === enzyme.id);
            const isNoncutter = enzymeSites.length === 0;
            return (
              <tr
                key={enzyme.id}
                className={`border-b border-[var(--border)] hover:bg-[var(--panel-muted)] transition-colors ${
                  isNoncutter ? 'opacity-55 hover:opacity-100' : ''
                }`}
              >
                <td className="pl-3">
                  <input
                    type="checkbox"
                    checked={selectedEnzymeIds.includes(enzyme.id)}
                    onChange={() => toggleEnzyme(enzyme.id)}
                    aria-label={`Select ${enzyme.name} for digest`}
                    className="accent-[var(--accent)] cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[13px] text-[var(--text)]">{enzyme.name}</span>
                    {enzyme.aliases && enzyme.aliases.length > 0 && (
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        ({enzyme.aliases.join(', ')})
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-[12px] text-[var(--accent)] font-medium tracking-wide">
                  {enzyme.recognitionSequence}
                </td>
                <td className="px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                  {getEndType(enzyme)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      enzyme.enzymeClass === 'type_iis'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                        : enzyme.category === 'rare_cutter'
                        ? 'bg-purple-500/10 text-purple-500 border border-purple-500/30'
                        : 'bg-[var(--panel-muted)] text-[var(--text-muted)]'
                    }`}
                  >
                    {enzyme.enzymeClass === 'type_iis' ? 'Type IIS' : enzyme.category === 'rare_cutter' ? '8-Cutter' : 'Type II'}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[12px]">
                  <span className={enzymeSites.length > 0 ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'}>
                    {enzymeSites.length}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {enzymeSites.map(site => (
                      <button
                        key={site.id}
                        onClick={() => {
                          selectRestrictionSite(site.id);
                          setActiveView('sequence');
                        }}
                        aria-label={`Show ${enzyme.name} cut at position ${site.forwardCut0 + 1} in sequence view`}
                        className={`rounded border px-1.5 py-0.5 font-mono text-[11px] cursor-pointer transition-colors ${
                          selectedRestrictionSiteId === site.id
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                            : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text)]'
                        }`}
                      >
                        {site.forwardCut0 + 1}
                      </button>
                    ))}
                    {isNoncutter && <span className="text-[var(--text-muted)]">—</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedEnzymeIds.length === 0 && (
        <div className="p-4 text-[var(--text-muted)] text-center">
          Select enzymes above to simulate in silico restriction digests and gel fragment patterns.
        </div>
      )}

      {selectedEnzymeIds.length > 0 && !digestResult && (
        <div className="p-4 text-[var(--text-muted)] text-center">
          Ready to digest with {selectedEnzymeIds.map(id => BUILTIN_ENZYMES.find(e => e.id === id)?.name).join(', ')}.
        </div>
      )}

      {digestResult && (
        <section className="m-3 border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--panel)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--panel-muted)] px-3 py-2">
            <span className="font-semibold text-[13px] text-[var(--text)]">
              Digest Result · {digestResult.cuts.length} cuts · {digestResult.fragments.length} fragments
            </span>
            <button
              onClick={() => setOpentronsOpen(true)}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-semibold border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-muted)] text-[var(--accent)] transition-colors cursor-pointer shadow-sm"
            >
              <Bot size={13} /> Export to Opentrons (.py)
            </button>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {[...digestResult.fragments]
              .sort((a, b) => b.lengthBp - a.lengthBp)
              .map(fragment => (
                <div key={fragment.id} className="grid grid-cols-[100px_1fr_1fr] gap-3 px-3 py-2">
                  <span className="font-mono font-semibold text-[var(--text)]">
                    {fragment.lengthBp.toLocaleString()} bp
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    Left: {fragment.leftEnd.type}
                    {fragment.leftEnd.sequence ? ` ${fragment.leftEnd.sequence}` : ''}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    Right: {fragment.rightEnd.type}
                    {fragment.rightEnd.sequence ? ` ${fragment.rightEnd.sequence}` : ''}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {digestResult && (
        <OpentronsExportDialog
          open={opentronsOpen}
          onOpenChange={setOpentronsOpen}
          mode="digest"
          digestParams={{
            dnaDocName: document.name,
            enzymeNames: selectedEnzymeIds.map(id => BUILTIN_ENZYMES.find(e => e.id === id)?.name || id)
          }}
        />
      )}
    </div>
  );
}
