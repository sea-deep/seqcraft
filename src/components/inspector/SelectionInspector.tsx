import type { SequenceDocument } from '../../domain/document';
import { useState, useEffect } from 'react';
import { ScientificSequence } from '../../scientific/nucleotide';
import { Translation } from 'nucleotide-sequence';

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

  useEffect(() => {
    setTranslationResult(null);
  }, [selection.start0, selection.end0Exclusive, document.id]);
  const isOriginSpanning = selection.end0Exclusive < selection.start0;
  const len = isOriginSpanning 
    ? (document.sequence.length - selection.start0 + selection.end0Exclusive)
    : (selection.end0Exclusive - selection.start0);
  const seqSlice = isOriginSpanning
    ? (document.sequence.raw.slice(selection.start0) + document.sequence.raw.slice(0, selection.end0Exclusive))
    : document.sequence.raw.slice(selection.start0, selection.end0Exclusive);
  
  let gcCount = 0;
  const upSeq = seqSlice.toUpperCase();
  for (let i = 0; i < upSeq.length; i++) {
    if (upSeq[i] === 'G' || upSeq[i] === 'C') gcCount++;
  }
  const gcPercent = len > 0 ? ((gcCount / len) * 100).toFixed(1) : '0.0';

  const formatNum = new Intl.NumberFormat('en-US');

  // Sequence preview
  let preview = '';
  if (len <= 60) {
    // Break into groups of 10
    const chunks = [];
    for (let i = 0; i < upSeq.length; i += 10) {
      chunks.push(upSeq.slice(i, i + 10));
    }
    preview = chunks.join(' ');
  } else {
    preview = upSeq.slice(0, 10) + '...' + upSeq.slice(-10);
  }

  return (
    <div className="flex flex-col text-[12px] font-ui space-y-3">
      <h2 className="text-[13px] font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Selection</h2>
      
      <div className="grid grid-cols-[80px_1fr] gap-y-2">
        <div className="text-[var(--text-muted)]">Range</div>
        <div className="text-[var(--text)] font-medium">{formatNum.format(selection.start0 + 1)}–{formatNum.format(selection.end0Exclusive)}</div>
        
        <div className="text-[var(--text-muted)]">Length</div>
        <div className="text-[var(--text)]">{formatNum.format(len)} bp</div>
        
        <div className="text-[var(--text-muted)]">GC Content</div>
        <div className="text-[var(--text)]">{gcPercent} %</div>
      </div>

      <div className="border-t border-[var(--border)] pt-3 mt-1 grid grid-cols-[80px_1fr]">
        <div className="text-[var(--text-muted)]">Sequence</div>
        <div className="font-mono text-[11px] text-[var(--text)] break-all">{preview}</div>
      </div>
      {translationResult && (
        <div className="mt-4 p-3 bg-[var(--panel-muted)] border border-[var(--border)] rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-semibold uppercase text-[var(--text)]">Translation</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {formatNum.format(translationResult.aa.length)} aa
            </span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mb-2">
            Frame +{translationResult.frame} ({formatNum.format(translationResult.start0 + 1)}–{formatNum.format(translationResult.end0Exclusive)})
          </div>
          <div className="font-mono text-[12px] text-[var(--text)] break-all max-h-[150px] overflow-y-auto bg-[var(--bg)] p-2 rounded border border-[var(--border)]">
            {translationResult.aa.split('').map((char, i) => (
              <span key={i} className={char === '*' ? 'text-red-500 font-bold' : ''}>
                {char}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)] pt-4 mt-2 flex flex-col gap-2">
        <button 
          className="text-left text-[var(--accent)] hover:underline text-[12px]"
          onClick={() => {
            const seq = new ScientificSequence(seqSlice);
            setTranslationResult({
              aa: Translation.translate(seq.engineSeq), // Using Translation directly
              start0: selection.start0,
              end0Exclusive: selection.end0Exclusive,
              strand: 1,
              frame: 1
            });
          }}
        >
          Translate
        </button>
        <button disabled className="text-left text-[var(--accent)] hover:underline text-[12px] disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">Create annotation</button>
        <button disabled className="text-left text-[var(--accent)] hover:underline text-[12px] disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">Create primer</button>
      </div>
    </div>
  );
}
