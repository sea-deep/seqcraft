import { getMemorySequence } from '../../utils/document-utils';
import { useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2, Bot } from 'lucide-react';
import type { SequenceDocument } from '../../domain/document';
import type { PCRResult } from '../../domain/pcr';
import { ScientificSequence } from '../../scientific/nucleotide';
import { analyzePrimerBindings } from '../../scientific/primer-binding';
import { analyzePrimerProperties } from '../../scientific/primer-properties';
import { simulatePCR } from '../../scientific/pcr';
import { useWorkspaceStore } from '../../state/workspace-store';
import { generateId } from '../../utils/id';
import { PrimerDialog } from './PrimerDialog';
import { OpentronsExportDialog } from '../tools/OpentronsExportDialog';

export function PrimersView({ document }: { document: SequenceDocument }) {
  const primers = useMemo(() => document.primers ?? [], [document.primers]);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingPrimerId, setEditingPrimerId] = useState<string | null>(null);
  const [forwardPrimerId, setForwardPrimerId] = useState(primers[0]?.id ?? '');
  const [reversePrimerId, setReversePrimerId] = useState(primers[1]?.id ?? primers[0]?.id ?? '');
  const [pcrResult, setPcrResult] = useState<PCRResult | null>(null);
  const [pcrMessage, setPcrMessage] = useState<string | null>(null);
  const [opentronsOpen, setOpentronsOpen] = useState(false);
  const selection = useWorkspaceStore(state => state.selection);
  const selectedPrimerId = useWorkspaceStore(state => state.selectedPrimerId);
  const selectPrimer = useWorkspaceStore(state => state.selectPrimer);
  const setSelection = useWorkspaceStore(state => state.setSelection);
  const deletePrimer = useWorkspaceStore(state => state.deletePrimer);
  const addDocument = useWorkspaceStore(state => state.addDocument);
  const setActiveView = useWorkspaceStore(state => state.setActiveView);
  const addHistoryEntry = useWorkspaceStore(state => state.addHistoryEntry);
  const activeSelection = selection?.documentId === document.id ? selection : null;
  const editingPrimer = primers.find(primer => primer.id === editingPrimerId);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return primers.filter(primer => !normalized || primer.name.toLowerCase().includes(normalized) || primer.sequence.toLowerCase().includes(normalized));
  }, [primers, query]);

  const isMemory = document.storageMode === 'memory' && Boolean(document.sequence);

  const runPCR = () => {
    if (!isMemory) {
      setPcrMessage('PCR simulation is only supported for in-memory documents.');
      setPcrResult(null);
      return;
    }
    const forwardPrimer = primers.find(primer => primer.id === forwardPrimerId);
    const reversePrimer = primers.find(primer => primer.id === reversePrimerId);
    if (!forwardPrimer || !reversePrimer || forwardPrimer.id === reversePrimer.id) {
      setPcrMessage('Choose two different primers.');
      setPcrResult(null);
      return;
    }
    const result = simulatePCR({ sequence: getMemorySequence(document).raw, topology: document.topology, forwardPrimer, reversePrimer });
    setPcrResult(result);
    setPcrMessage(result.products.length === 0 ? 'No valid amplicon was found for this primer pair.' : `${result.products.length} predicted amplicon${result.products.length === 1 ? '' : 's'}.`);
  };

  const openProduct = (product: PCRResult['products'][number]) => {
    const forwardPrimer = primers.find(primer => primer.id === product.forwardPrimerId);
    const reversePrimer = primers.find(primer => primer.id === product.reversePrimerId);
    const productDocument: SequenceDocument = {
      length: product.sequence.length,
      storageMode: "memory",
      id: generateId(), name: `${document.name} PCR product (${product.lengthBp} bp)`, topology: 'linear',
      sequence: new ScientificSequence(product.sequence, 'DNA'), alphabet: 'DNA', features: [],
      primers: [forwardPrimer, reversePrimer].filter((primer): primer is NonNullable<typeof primer> => Boolean(primer)),
      source: 'pcr_product', version: 1,
    };
    addDocument(productDocument);
    addHistoryEntry({ documentId: productDocument.id, action: 'pcr', summary: `Created from PCR on ${document.name}` });
    setActiveView('sequence');
  };

  return (
    <div className="h-full overflow-auto bg-[var(--bg)] font-ui text-[12px]">
      <div className="sticky top-0 z-10 flex h-[44px] items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-3">
        <div className="relative max-w-[360px] flex-1"><Search className="absolute left-2 top-2 h-3.5 w-3.5 text-[var(--text-muted)]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter primers" className="h-[30px] w-full rounded-md border border-[var(--border)] bg-[var(--bg)] pl-7 pr-2 outline-none focus:border-[var(--accent)]" /></div>
        <button onClick={() => setCreating(true)} className="ml-auto flex h-[30px] items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] shadow-sm transition-colors cursor-pointer"><Plus size={14} />{activeSelection ? 'Create from selection' : 'Add primer'}</button>
      </div>
      <table className="w-full border-collapse">
        <thead className="bg-[var(--panel-muted)] text-left text-[11px] text-[var(--text-muted)]"><tr><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Sequence 5′→3′</th><th className="px-3 py-2 font-medium">Length</th><th className="px-3 py-2 font-medium">GC</th><th className="px-3 py-2 font-medium">Tm</th><th className="px-3 py-2 font-medium">Bindings</th><th className="w-[76px]" /></tr></thead>
        <tbody>{filtered.map(primer => {
          const properties = analyzePrimerProperties(primer.sequence);
          const bindings = isMemory ? analyzePrimerBindings(getMemorySequence(document).raw, document.topology, primer) : [];
          return (
            <tr
              key={primer.id}
              tabIndex={0}
              aria-selected={selectedPrimerId === primer.id}
              onClick={() => { if (bindings[0]) setSelection(document.id, bindings[0].start0, bindings[0].end0Exclusive); selectPrimer(primer.id); }}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  if (bindings[0]) setSelection(document.id, bindings[0].start0, bindings[0].end0Exclusive);
                  selectPrimer(primer.id);
                }
              }}
              className={`cursor-pointer border-b border-[var(--border)] outline-none hover:bg-[var(--panel-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${selectedPrimerId === primer.id ? 'bg-[var(--accent-soft)]' : ''}`}
            >
              <td className="px-3 py-2 font-medium">{primer.name}</td><td className="max-w-[260px] truncate px-3 py-2 font-mono" title={primer.sequence}>{primer.sequence}</td><td className="px-3 py-2 font-mono">{properties.length}</td><td className="px-3 py-2">{properties.gcPercent.toFixed(1)}%</td><td className="px-3 py-2">{properties.meltingTemperature.toFixed(1)}°C</td><td className="px-3 py-2">{bindings.length}</td>
              <td className="px-2"><div className="flex"><button aria-label={`Edit ${primer.name}`} onClick={event => { event.stopPropagation(); setEditingPrimerId(primer.id); }} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)]"><Edit3 size={14} /></button><button aria-label={`Delete ${primer.name}`} onClick={event => { event.stopPropagation(); if (window.confirm(`Delete primer “${primer.name}”?`)) deletePrimer(document.id, primer.id); }} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]"><Trash2 size={14} /></button></div></td>
            </tr>
          );
        })}</tbody>
      </table>
      {primers.length === 0 && <div className="p-6 text-center text-[var(--text-muted)]">No primers yet. Select bases or add a primer sequence manually.</div>}

      <section className="m-3 border border-[var(--border)] bg-[var(--panel)]">
        <div className="border-b border-[var(--border)] px-3 py-2 font-semibold">PCR simulation</div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 p-3">
          <select value={forwardPrimerId} onChange={event => setForwardPrimerId(event.target.value)} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2"><option value="">Forward primer</option>{primers.map(primer => <option key={primer.id} value={primer.id}>{primer.name}</option>)}</select>
          <select value={reversePrimerId} onChange={event => setReversePrimerId(event.target.value)} className="h-[34px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-2"><option value="">Reverse primer</option>{primers.map(primer => <option key={primer.id} value={primer.id}>{primer.name}</option>)}</select>
          <button onClick={runPCR} className="h-[34px] rounded-md bg-[var(--accent)] px-3 text-[12px] font-semibold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] shadow-sm transition-colors cursor-pointer">Simulate PCR</button>
        </div>
        {pcrMessage && <div className="px-3 pb-3 text-[var(--text-secondary)]">{pcrMessage}</div>}
        {pcrResult?.products.map(product => {
          return (
            <div key={product.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-2">
              <div>
                <div className="font-medium">{product.lengthBp.toLocaleString()} bp amplicon</div>
                <div className="font-mono text-[11px] text-[var(--text-muted)]">
                  {product.segments.map(segment => `${segment.start0 + 1}–${segment.end0Exclusive}`).join(', ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setOpentronsOpen(true)} 
                  className="flex items-center gap-1.5 h-[30px] rounded-md border border-[var(--border)] bg-[var(--panel-muted)] px-2.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--panel)] transition-colors cursor-pointer shadow-sm"
                >
                  <Bot size={13} /> Export to Opentrons (.py)
                </button>
                <button 
                  onClick={() => openProduct(product)} 
                  className="h-[30px] rounded-md border border-[var(--border)] px-3 hover:bg-[var(--panel-muted)] text-xs font-medium cursor-pointer"
                >
                  Open product
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {creating && <PrimerDialog document={document} selection={activeSelection ?? undefined} open onOpenChange={setCreating} />}
      {editingPrimer && editingPrimerId && <PrimerDialog document={document} primer={editingPrimer} open onOpenChange={open => !open && setEditingPrimerId(null)} />}
      
      {pcrResult?.products[0] && (
        <OpentronsExportDialog
          open={opentronsOpen}
          onOpenChange={setOpentronsOpen}
          mode="pcr"
          pcrParams={{
            templateDocName: document.name,
            forwardPrimerName: primers.find(p => p.id === pcrResult.products[0].forwardPrimerId)?.name || 'Forward-Primer',
            reversePrimerName: primers.find(p => p.id === pcrResult.products[0].reversePrimerId)?.name || 'Reverse-Primer',
            ampliconLengthBp: pcrResult.products[0].lengthBp,
            annealingTempC: 56.0
          }}
        />
      )}
    </div>
  );
}
