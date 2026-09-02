import type { SequenceDocument } from '../../domain/document';
import { useEffect, useState } from 'react';
import { ScientificSequence } from '../../scientific/nucleotide';
import { Translation } from 'nucleotide-sequence';
import { FeatureDialog } from '../features/FeatureDialog';
import { PrimerDialog } from '../primers/PrimerDialog';
import { getMemorySequence, getSequenceStorageKey } from '../../utils/document-utils';
import { opfsStorage } from '../../storage/opfs-backend';
import { useWorkspaceStore } from '../../state/workspace-store';
import { generateId } from '../../utils/id';

interface SelectionInspectorProps {
  document: SequenceDocument;
  selection: { start0: number; end0Exclusive: number };
}

export function SelectionInspector({ document, selection }: SelectionInspectorProps) {
  const [translationResult, setTranslationResult] = useState<{
    aa: string;
    start0: number;
    end0Exclusive: number;
    strand: 1;
    frame: number;
  } | null>(null);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [primerDialogOpen, setPrimerDialogOpen] = useState(false);
  
  const [seqSlice, setSeqSlice] = useState<string>('');
  const [loadingSeq, setLoadingSeq] = useState(true);

  const addDocument = useWorkspaceStore(s => s.addDocument);
  const setActiveView = useWorkspaceStore(s => s.setActiveView);
  const addHistoryEntry = useWorkspaceStore(s => s.addHistoryEntry);

  const isOriginSpanning = selection.end0Exclusive < selection.start0;
  const len = isOriginSpanning 
    ? (document.length - selection.start0 + selection.end0Exclusive)
    : (selection.end0Exclusive - selection.start0);
    
  const isMemory = document.storageMode === 'memory';

  useEffect(() => {
    let active = true;
    setLoadingSeq(true);

    const fetchSlice = async () => {
      try {
        let str = '';
        if (isMemory) {
          const raw = getMemorySequence(document).raw;
          str = isOriginSpanning 
            ? raw.slice(selection.start0) + raw.slice(0, selection.end0Exclusive)
            : raw.slice(selection.start0, selection.end0Exclusive);
        } else {
          if (isOriginSpanning) {
            const key = getSequenceStorageKey(document);
            const p1 = await opfsStorage.readSequenceRange(key, selection.start0, document.length);
            const p2 = await opfsStorage.readSequenceRange(key, 0, selection.end0Exclusive);
            str = p1 + p2;
          } else {
            str = await opfsStorage.readSequenceRange(getSequenceStorageKey(document), selection.start0, selection.end0Exclusive);
          }
        }
        if (active) {
          setSeqSlice(str);
          setLoadingSeq(false);
        }
      } catch (err) {
        if (active) {
          console.error("Failed to load selection", err);
          setSeqSlice('');
          setLoadingSeq(false);
        }
      }
    };
    
    fetchSlice();
    return () => { active = false; };
  }, [document.id, document.length, selection.start0, selection.end0Exclusive, isOriginSpanning, isMemory, document]);

  let gcCount = 0;
  const upSeq = seqSlice.toUpperCase();
  for (let i = 0; i < upSeq.length; i++) {
    if (upSeq[i] === 'G' || upSeq[i] === 'C') gcCount++;
  }
  const gcPercent = len > 0 ? ((gcCount / len) * 100).toFixed(1) : '0.0';

  const formatNum = new Intl.NumberFormat('en-US');

  const preview = (() => {
    if (loadingSeq) return 'Loading...';
    if (len <= 60) {
      const chunks = [];
      for (let i = 0; i < upSeq.length; i += 10) {
        chunks.push(upSeq.slice(i, i + 10));
      }
      return chunks.join(' ');
    }
    return upSeq.slice(0, 10) + '...' + upSeq.slice(-10);
  })();

  const activeTranslation = translationResult?.start0 === selection.start0 && translationResult.end0Exclusive === selection.end0Exclusive ? translationResult : null;

  const handleExtract = () => {
    if (loadingSeq || !seqSlice) return;
    const docId = generateId();
    const newDoc: SequenceDocument = {
      id: docId,
      name: `${document.name} (Extract ${formatNum.format(selection.start0 + 1)}-${formatNum.format(selection.end0Exclusive)})`,
      topology: 'linear',
      length: seqSlice.length,
      storageMode: 'memory',
      sequence: new ScientificSequence(seqSlice, document.alphabet),
      alphabet: document.alphabet,
      features: [],
      primers: [],
      source: 'raw',
      version: 1
    };
    addDocument(newDoc);
    addHistoryEntry({ documentId: docId, action: 'metadata', summary: `Extracted from ${document.name}` });
    setActiveView('sequence');
  };

  return (
    <div className="flex flex-col text-[12px] font-ui space-y-3">
      <h2 className="text-[13px] font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Selection</h2>
      
      <div className="grid grid-cols-[80px_1fr] gap-y-2">
        <div className="text-[var(--text-muted)]">Range</div>
        <div className="text-[var(--text)] font-medium">{formatNum.format(selection.start0 + 1)}–{formatNum.format(selection.end0Exclusive)}</div>
        
        <div className="text-[var(--text-muted)]">Length</div>
        <div className="text-[var(--text)]">{formatNum.format(len)} bp</div>
        
        <div className="text-[var(--text-muted)]">GC Content</div>
        <div className="text-[var(--text)]">{loadingSeq ? '...' : gcPercent} %</div>
      </div>

      <div className="border-t border-[var(--border)] pt-3 mt-1 grid grid-cols-[80px_1fr]">
        <div className="text-[var(--text-muted)]">Sequence</div>
        <div className="font-mono text-[11px] text-[var(--text)] break-all">{preview}</div>
      </div>
      
      {activeTranslation && !loadingSeq && (
        <div className="mt-4 p-3 bg-[var(--panel-muted)] border border-[var(--border)] rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-semibold uppercase text-[var(--text)]">Translation</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {formatNum.format(activeTranslation.aa.length)} aa
            </span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mb-2">
            Frame +{activeTranslation.frame} ({formatNum.format(activeTranslation.start0 + 1)}–{formatNum.format(activeTranslation.end0Exclusive)})
          </div>
          <div className="font-mono text-[12px] text-[var(--text)] break-all max-h-[150px] overflow-y-auto bg-[var(--bg)] p-2 rounded border border-[var(--border)]">
            {activeTranslation.aa.split('').map((char, i) => (
              <span key={i} className={char === '*' ? 'text-red-500 font-bold' : ''}>
                {char}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)] pt-4 mt-2 flex flex-col gap-2">
        <button 
          className="text-left text-[var(--accent)] hover:underline text-[12px] disabled:opacity-50"
          disabled={loadingSeq}
          onClick={handleExtract}
        >
          Extract as New Document
        </button>
        <button 
          className="text-left text-[var(--accent)] hover:underline text-[12px] disabled:opacity-50"
          disabled={loadingSeq}
          onClick={() => {
            const seq = new ScientificSequence(seqSlice);
            setTranslationResult({
              aa: Translation.translate(seq.engineSeq),
              start0: selection.start0,
              end0Exclusive: selection.end0Exclusive,
              strand: 1,
              frame: 1
            });
          }}
        >
          Translate
        </button>
        {isMemory && (
          <>
            <button onClick={() => setFeatureDialogOpen(true)} className="text-left text-[var(--accent)] hover:underline text-[12px]">Create annotation</button>
            <button onClick={() => setPrimerDialogOpen(true)} className="text-left text-[var(--accent)] hover:underline text-[12px]">Create primer</button>
          </>
        )}
      </div>
      {featureDialogOpen && <FeatureDialog document={document} selection={selection} open onOpenChange={setFeatureDialogOpen} />}
      {primerDialogOpen && <PrimerDialog document={document} selection={selection} open onOpenChange={setPrimerDialogOpen} />}
    </div>
  );
}
