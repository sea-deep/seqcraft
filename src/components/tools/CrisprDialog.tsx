import { useState, useMemo } from 'react';
import { Crosshair, Copy, Check, BookmarkPlus, AlertCircle, Dna } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import type { SequenceDocument } from '../../domain/document';
import { findCrisprTargets, CAS_NUCLEASES, type CrisprTarget } from '../../scientific/crispr';
import type { CasNucleaseId } from '../../domain/crispr';
import { getMemorySequence } from '../../utils/document-utils';
import { useWorkspaceStore } from '../../state/workspace-store';
import { generateId } from '../../utils/id';

export interface CrisprDialogProps {
  document: SequenceDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection?: { start0: number; end0Exclusive: number };
}

export function CrisprDialog({ document, open, onOpenChange, selection }: CrisprDialogProps) {
  const [nucleaseId, setNucleaseId] = useState<CasNucleaseId>('SpCas9');
  const [minQualityScore, setMinQualityScore] = useState(50);
  const [onlySelection, setOnlySelection] = useState(Boolean(selection));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const addFeature = useWorkspaceStore(state => state.addFeature);
  const addHistoryEntry = useWorkspaceStore(state => state.addHistoryEntry);

  const selectedNuclease = useMemo(() => {
    return CAS_NUCLEASES.find(n => n.id === nucleaseId) || CAS_NUCLEASES[0];
  }, [nucleaseId]);

  const targets = useMemo(() => {
    if (document.storageMode !== 'memory' || !document.sequence) return [];
    const rawSeq = getMemorySequence(document).raw;
    const targetRegion = onlySelection && selection ? selection : undefined;
    return findCrisprTargets(rawSeq, document.topology, {
      nuclease: nucleaseId,
      targetRegion,
      minQualityScore,
      maxResults: 40
    });
  }, [document, nucleaseId, onlySelection, selection, minQualityScore]);

  const handleCopySpacer = async (target: CrisprTarget) => {
    await navigator.clipboard.writeText(target.spacer);
    setCopiedId(target.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAnnotateTarget = (target: CrisprTarget) => {
    const L = document.length;
    let segments: import('../../domain/feature').SequenceInterval[];
    const spacerLen = target.spacer.length;

    if (target.pamOrientation === '3prime') {
      if (target.strand === 1) {
        const rawStart = target.pamStart0 - spacerLen;
        const rawEnd = target.pamEnd0Exclusive;
        if (document.topology === 'circular' && rawStart < 0) {
          segments = [
            { start0: L + rawStart, end0Exclusive: L },
            { start0: 0, end0Exclusive: rawEnd }
          ];
        } else {
          segments = [{ start0: Math.max(0, rawStart), end0Exclusive: Math.min(L, rawEnd) }];
        }
      } else {
        const rawStart = target.pamStart0;
        const rawEnd = target.pamEnd0Exclusive + spacerLen;
        if (document.topology === 'circular' && rawEnd > L) {
          segments = [
            { start0: rawStart, end0Exclusive: L },
            { start0: 0, end0Exclusive: rawEnd - L }
          ];
        } else {
          segments = [{ start0: Math.max(0, rawStart), end0Exclusive: Math.min(L, rawEnd) }];
        }
      }
    } else {
      // 5' PAM (e.g. Cas12a)
      if (target.strand === 1) {
        const rawStart = target.pamStart0;
        const rawEnd = target.pamEnd0Exclusive + spacerLen;
        if (document.topology === 'circular' && rawEnd > L) {
          segments = [
            { start0: rawStart, end0Exclusive: L },
            { start0: 0, end0Exclusive: rawEnd - L }
          ];
        } else {
          segments = [{ start0: Math.max(0, rawStart), end0Exclusive: Math.min(L, rawEnd) }];
        }
      } else {
        const rawStart = target.pamStart0 - spacerLen;
        const rawEnd = target.pamEnd0Exclusive;
        if (document.topology === 'circular' && rawStart < 0) {
          segments = [
            { start0: L + rawStart, end0Exclusive: L },
            { start0: 0, end0Exclusive: rawEnd }
          ];
        } else {
          segments = [{ start0: Math.max(0, rawStart), end0Exclusive: Math.min(L, rawEnd) }];
        }
      }
    }

    const feature = {
      id: generateId(),
      name: `gRNA (${target.nucleaseId}): ${target.spacer.slice(0, 8)}...`,
      type: 'crispr_target' as const,
      strand: target.strand,
      segments: segments.filter(s => s.start0 < s.end0Exclusive),
      qualifiers: {
        nuclease: target.nucleaseName,
        pam: target.pam,
        pamOrientation: target.pamOrientation,
        qualityScore: String(target.qualityScore),
        gcPercent: `${target.gcPercent}%`,
        spacer: target.spacer,
        cleavage: target.cleavageType,
        source: 'SeqCraft In Silico CRISPR Designer'
      },
      source: 'detected' as const
    };

    addFeature(document.id, feature);
    addHistoryEntry({
      documentId: document.id,
      action: 'feature',
      summary: `Annotated ${target.nucleaseId} CRISPR guide target (${target.qualityScore}% quality)`
    });

    setAddedIds(prev => new Set(prev).add(target.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 bg-[var(--panel)] border-[var(--border)] text-[var(--text)]">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              <Crosshair size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                CRISPR Guide RNA Designer & Microhomology Scoring
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-medium">
                  {selectedNuclease.id}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-muted)] mt-0.5">
                Multi-nuclease PAM scanning, GC balance, Pol III termination checks, and MMEJ frameshift predictions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-[var(--border)] bg-[var(--panel-muted)] px-3 rounded-lg text-xs">
          {/* Nuclease Picker */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] font-medium">Nuclease:</span>
            <select
              value={nucleaseId}
              onChange={e => setNucleaseId(e.target.value as CasNucleaseId)}
              className="h-8 rounded border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--text)] font-medium outline-none focus:border-[var(--accent)]"
            >
              {CAS_NUCLEASES.map(n => (
                <option key={n.id} value={n.id}>
                  {n.name} (PAM: {n.pamMotif})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Min Quality:</span>
              <input
                type="range"
                min={0}
                max={90}
                step={10}
                value={minQualityScore}
                onChange={e => setMinQualityScore(Number(e.target.value))}
                className="w-20 accent-[var(--accent)]"
              />
              <span className="font-mono text-[var(--text)] font-semibold w-8">{minQualityScore}%</span>
            </div>

            {selection && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlySelection}
                  onChange={e => setOnlySelection(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-[var(--text)]">Target selection ({selection.end0Exclusive - selection.start0} bp)</span>
              </label>
            )}
          </div>
        </div>

        {/* Nuclease Spec Banner */}
        <div className="text-[11px] text-[var(--text-secondary)] px-3 py-1.5 rounded bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
          <span>
            <strong>PAM:</strong> {selectedNuclease.pamMotif} ({selectedNuclease.pamOrientation}) ·{' '}
            <strong>Spacer:</strong> {selectedNuclease.spacerLengthBp} nt ·{' '}
            <strong>Cleavage:</strong> {selectedNuclease.cleavageType}
          </span>
          <span className="text-[var(--text-muted)]">{selectedNuclease.description}</span>
        </div>

        {/* Target List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[300px]">
          {targets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] space-y-2">
              <Dna size={32} className="opacity-40" />
              <p>No {selectedNuclease.id} target sites found matching criteria.</p>
              <p className="text-[11px]">Try lowering the minimum quality score threshold.</p>
            </div>
          ) : (
            targets.map(target => {
              const isAdded = addedIds.has(target.id);
              const isCopied = copiedId === target.id;
              const isHigh = target.qualityScore >= 75;
              const isMedium = target.qualityScore >= 50 && target.qualityScore < 75;

              return (
                <div
                  key={target.id}
                  className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/50 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-md flex flex-col items-center justify-center font-mono font-bold text-xs ${
                          isHigh
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : isMedium
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}
                      >
                        <span>{target.qualityScore}</span>
                        <span className="text-[9px] font-normal leading-none">%</span>
                      </div>

                      <div>
                        <div className="font-mono text-xs font-semibold tracking-wide flex items-center gap-1.5">
                          {target.pamOrientation === '5prime' && (
                            <span className="text-[var(--accent)] font-bold">{target.pam}</span>
                          )}
                          <span className="text-[var(--text)]">{target.spacer}</span>
                          {target.pamOrientation === '3prime' && (
                            <span className="text-[var(--accent)] font-bold">{target.pam}</span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--panel-muted)] text-[var(--text-muted)]">
                            {target.strand === 1 ? '+ strand' : '- strand'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex gap-3">
                          <span>PAM: {target.pamStart0 + 1}–{target.pamEnd0Exclusive}</span>
                          <span>Cut: {target.cutSite0 + 1}{target.bottomCutSite0 ? ` / ${target.bottomCutSite0 + 1}` : ''}</span>
                          <span>GC: {target.gcPercent}%</span>
                          <span>Frameshift: {Math.round(target.frameshiftProbability * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopySpacer(target)}
                        className="p-1.5 rounded border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-muted)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                        title="Copy spacer nucleotide sequence"
                      >
                        {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>

                      <button
                        onClick={() => handleAnnotateTarget(target)}
                        disabled={isAdded}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                          isAdded
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 cursor-default'
                            : 'border-[var(--accent)]/40 bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] text-[var(--accent)]'
                        }`}
                      >
                        {isAdded ? <Check size={13} /> : <BookmarkPlus size={13} />}
                        {isAdded ? 'Annotated' : 'Add to Map'}
                      </button>
                    </div>
                  </div>

                  {target.penalties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {target.penalties.map((pen, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        >
                          <AlertCircle size={10} /> {pen}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
