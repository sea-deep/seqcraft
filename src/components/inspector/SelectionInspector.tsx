import type { SequenceDocument } from '../../domain/document';
import type { Feature } from '../../domain/feature';
import { useEffect, useState } from 'react';
import { ScientificSequence } from '../../scientific/nucleotide';
import { Translation } from 'nucleotide-sequence';
import { FeatureDialog } from '../features/FeatureDialog';
import { PrimerDialog } from '../primers/PrimerDialog';
import { getMemorySequence, getSequenceStorageKey } from '../../utils/document-utils';
import { opfsStorage } from '../../storage/opfs-backend';
import { useWorkspaceStore } from '../../state/workspace-store';
import { generateId } from '../../utils/id';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { FilePlus, Languages, BookmarkPlus, LocateFixed, Crosshair, Sparkles, Trash2, ArrowLeftRight } from 'lucide-react';
import { CrisprDialog } from '../tools/CrisprDialog';
import { SequenceMutatorDialog } from '../tools/SequenceMutatorDialog';

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
  const [crisprDialogOpen, setCrisprDialogOpen] = useState(false);
  const [mutatorOpen, setMutatorOpen] = useState(false);
  const [mutatorMode, setMutatorMode] = useState<"insert" | "replace" | "rotate_origin">("replace");
  
  const [seqSlice, setSeqSlice] = useState<string>('');
  const [loadingSeq, setLoadingSeq] = useState(true);

  const addDocument = useWorkspaceStore(s => s.addDocument);
  const setActiveView = useWorkspaceStore(s => s.setActiveView);
  const addHistoryEntry = useWorkspaceStore(s => s.addHistoryEntry);
  const mutateDocumentSequence = useWorkspaceStore(s => s.mutateDocumentSequence);

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
    const selStart = selection.start0;
    const selEnd = selection.end0Exclusive;

    const extractedFeatures: Feature[] = [];
    for (const f of document.features) {
      const clippedSegments: import('../../domain/feature').SequenceInterval[] = [];
      for (const seg of f.segments) {
        const overlapStart = Math.max(seg.start0, selStart);
        const overlapEnd = Math.min(seg.end0Exclusive, selEnd);
        if (overlapStart < overlapEnd) {
          clippedSegments.push({
            start0: overlapStart - selStart,
            end0Exclusive: overlapEnd - selStart
          });
        }
      }
      if (clippedSegments.length > 0) {
        extractedFeatures.push({
          ...f,
          id: generateId(),
          segments: clippedSegments
        });
      }
    }

    const newDoc: SequenceDocument = {
      id: docId,
      name: `${document.name} (Extract ${formatNum.format(selection.start0 + 1)}-${formatNum.format(selection.end0Exclusive)})`,
      topology: 'linear',
      length: seqSlice.length,
      storageMode: 'memory',
      sequence: new ScientificSequence(seqSlice, document.alphabet),
      alphabet: document.alphabet,
      features: extractedFeatures,
      primers: [],
      source: 'raw',
      version: 1
    };
    addDocument(newDoc);
    addHistoryEntry({ documentId: docId, action: 'metadata', summary: `Extracted from ${document.name} (${extractedFeatures.length} feature(s) preserved)` });
    setActiveView('sequence');
  };

  return (
    <div className="flex flex-col text-[12px] font-ui space-y-3">
      <h2 className="text-[14px] font-semibold text-[var(--text)] mb-1">Selection</h2>
      
      <div className="grid grid-cols-[80px_1fr] gap-y-2">
        <div className="text-[var(--text-muted)]">Range</div>
        <div className="text-[var(--text-secondary)] font-mono font-medium">{formatNum.format(selection.start0 + 1)}–{formatNum.format(selection.end0Exclusive)}</div>
        
        <div className="text-[var(--text-muted)]">Length</div>
        <div className="text-[var(--text-secondary)] font-mono">{formatNum.format(len)} bp</div>
        
        <div className="text-[var(--text-muted)]">GC Content</div>
        <div className="text-[var(--text-secondary)] font-mono">{loadingSeq ? '...' : gcPercent} %</div>
      </div>

      <div className="border-t border-[var(--border)] pt-3 mt-1 grid grid-cols-[80px_1fr]">
        <div className="text-[var(--text-muted)]">Sequence</div>
        {loadingSeq ? (
          <Skeleton className="h-4 w-full mt-0.5" />
        ) : (
          <div className="font-mono text-[11px] text-[var(--accent)] break-all font-medium">{preview}</div>
        )}
      </div>
      
      {activeTranslation && !loadingSeq && (
        <div className="mt-4 p-3 bg-[var(--panel-muted)] border border-[var(--border)] rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-semibold text-[var(--text)]">Translation</span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {formatNum.format(activeTranslation.aa.length)} aa
            </span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mb-2">
            Frame +{activeTranslation.frame} ({formatNum.format(activeTranslation.start0 + 1)}–{formatNum.format(activeTranslation.end0Exclusive)})
          </div>
          <div className="font-mono text-[12px] text-[var(--text)] break-all max-h-[150px] overflow-y-auto bg-[var(--bg)] p-2 rounded border border-[var(--border)]">
            {activeTranslation.aa.split('').map((char, i) => (
              <span key={i} className={char === '*' ? 'text-[var(--danger)] font-bold' : ''}>
                {char}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)] pt-3.5 mt-2 flex flex-col gap-1.5">
        <Button 
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-[12px] h-[30px]"
          disabled={loadingSeq}
          onClick={handleExtract}
        >
          <FilePlus size={14} className="text-[var(--accent)]" />
          Extract as New Document
        </Button>
        <Button 
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-[12px] h-[30px]"
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
          <Languages size={14} className="text-[var(--accent)]" />
          Translate selection
        </Button>
        {isMemory && (
          <>
            <Button 
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-[12px] h-[30px]"
              onClick={() => setFeatureDialogOpen(true)}
            >
              <BookmarkPlus size={14} className="text-[var(--accent)]" />
              Create annotation
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-[12px] h-[30px]"
              onClick={() => setPrimerDialogOpen(true)}
            >
              <LocateFixed size={14} className="text-[var(--accent)]" />
              Design primer
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-[12px] h-[30px]"
              onClick={() => setCrisprDialogOpen(true)}
            >
              <Crosshair size={14} className="text-[var(--accent)]" />
              Scan CRISPR Guides
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-[12px] h-[30px]"
              onClick={() => { setMutatorMode('replace'); setMutatorOpen(true); }}
            >
              <Sparkles size={14} className="text-[var(--accent)]" />
              Mutate / Replace Bases...
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-[12px] h-[30px]"
              onClick={() => {
                mutateDocumentSequence(document.id, {
                  type: 'reverse_complement',
                  start0: selection.start0,
                  end0Exclusive: selection.end0Exclusive
                });
              }}
            >
              <ArrowLeftRight size={14} className="text-[var(--accent)]" />
              Invert Strand (Rev-Comp)
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-[12px] h-[30px] text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
              onClick={() => {
                mutateDocumentSequence(document.id, {
                  type: 'delete',
                  start0: selection.start0,
                  end0Exclusive: selection.end0Exclusive
                });
              }}
            >
              <Trash2 size={14} className="text-[var(--danger)]" />
              Delete Selected Bases
            </Button>
          </>
        )}
      </div>
      {featureDialogOpen && <FeatureDialog document={document} selection={selection} open onOpenChange={setFeatureDialogOpen} />}
      {primerDialogOpen && <PrimerDialog document={document} selection={selection} open onOpenChange={setPrimerDialogOpen} />}
      {crisprDialogOpen && <CrisprDialog document={document} selection={selection} open onOpenChange={setCrisprDialogOpen} />}
      {mutatorOpen && (
        <SequenceMutatorDialog
          document={document}
          initialMode={mutatorMode}
          selection={selection}
          open={mutatorOpen}
          onOpenChange={setMutatorOpen}
        />
      )}
    </div>
  );
}
