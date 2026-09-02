import { useState, useMemo } from "react";
import { 
  Crosshair, Copy, Check, BookmarkPlus, AlertCircle, Sparkles 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import type { SequenceDocument } from "../../domain/document";
import { findCrisprTargets } from "../../scientific/crispr";
import type { CrisprTarget } from "../../scientific/crispr";
import { getMemorySequence } from "../../utils/document-utils";
import { useWorkspaceStore } from "../../state/workspace-store";
import { generateId } from "../../utils/id";

export interface CrisprDialogProps {
  document: SequenceDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection?: { start0: number; end0Exclusive: number };
}

export function CrisprDialog({
  document,
  open,
  onOpenChange,
  selection
}: CrisprDialogProps) {
  const [minQualityScore, setMinQualityScore] = useState(50);
  const [onlySelection, setOnlySelection] = useState(Boolean(selection));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const addFeature = useWorkspaceStore(state => state.addFeature);
  const addHistoryEntry = useWorkspaceStore(state => state.addHistoryEntry);

  const targets = useMemo(() => {
    const rawSeq = getMemorySequence(document).raw;
    const targetRegion = onlySelection && selection ? selection : undefined;
    return findCrisprTargets(rawSeq, document.topology, {
      targetRegion,
      minQualityScore,
      maxResults: 40
    });
  }, [document, onlySelection, selection, minQualityScore]);

  const handleCopySpacer = async (target: CrisprTarget) => {
    await navigator.clipboard.writeText(target.spacer);
    setCopiedId(target.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAnnotateTarget = (target: CrisprTarget) => {
    const start0 = target.strand === 1 ? target.pamStart0 - 20 : target.pamStart0;
    const end0Exclusive = target.strand === 1 ? target.pamEnd0Exclusive : target.pamEnd0Exclusive + 20;

    const feature = {
      id: generateId(),
      name: "gRNA: " + target.spacer.slice(0, 10) + "...",
      type: "misc_feature" as const,
      strand: target.strand,
      segments: [{ start0, end0Exclusive }],
      qualifiers: {
        note: "SpCas9 PAM: " + target.pam + "; Quality: " + target.qualityScore + "%; Frameshift Likelihood: " + Math.round(target.frameshiftProbability * 100) + "%"
      },
      source: "agent" as const
    };

    addFeature(document.id, feature);
    addHistoryEntry({
      documentId: document.id,
      action: "feature",
      summary: "Added CRISPR guide " + feature.name
    });

    setAddedIds(prev => new Set([...prev, target.id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-[var(--panel)] border-[var(--border)]">
        <DialogHeader className="px-6 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
              <Crosshair size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                CRISPR SpCas9 Target Radar & MMEJ Forecaster
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-muted)]">
                Scan for 5'-NGG-3' PAMs, evaluate on-target guide efficiency, and predict microhomology deletion patterns.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--panel-muted)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--text)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] font-medium">Min Quality:</span>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={minQualityScore}
                onChange={e => setMinQualityScore(Number(e.target.value))}
                className="w-24 accent-[var(--accent)] cursor-pointer"
              />
              <span className="font-mono font-semibold text-[var(--accent)]">{minQualityScore}%</span>
            </div>

            {selection && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlySelection}
                  onChange={e => setOnlySelection(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-[var(--text-secondary)]">Selection only ({selection.start0 + 1}–{selection.end0Exclusive})</span>
              </label>
            )}
          </div>

          <div className="text-xs text-[var(--text-muted)] font-medium">
            Found <span className="font-mono font-bold text-[var(--text)]">{targets.length}</span> target sites
          </div>
        </div>

        {/* Target List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[350px]">
          {targets.length === 0 && (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-2">
              <AlertCircle size={24} className="mx-auto text-[var(--text-muted)] opacity-60" />
              <p>No SpCas9 targets found meeting the minimum quality score ({minQualityScore}%).</p>
              <p className="text-[11px]">Try lowering the quality threshold or expanding the search window.</p>
            </div>
          )}

          {targets.map(target => (
            <div 
              key={target.id}
              className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent)]/40 transition-colors space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={"px-2 py-0.5 rounded text-[11px] font-bold font-mono " + (target.qualityScore >= 75 ? "bg-[var(--success)]/15 text-[var(--success)]" : target.qualityScore >= 50 ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-[var(--warning)]/15 text-[var(--warning)]")}>
                    {target.qualityScore}% Quality
                  </span>
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Strand: <strong className="text-[var(--text)]">{target.strand === 1 ? "+ (Sense)" : "- (Antisense)"}</strong>
                  </span>
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Cut: <strong className="font-mono text-[var(--text)]">{target.cutSite0 + 1}</strong>
                  </span>
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    GC: <strong className="font-mono text-[var(--text)]">{target.gcPercent}%</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopySpacer(target)}
                    className="flex items-center gap-1 h-7 px-2.5 rounded border border-[var(--border)] bg-[var(--panel-muted)] text-[11px] hover:text-[var(--text)] transition-colors cursor-pointer"
                  >
                    {copiedId === target.id ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
                    {copiedId === target.id ? "Copied" : "Copy Spacer"}
                  </button>
                  <button
                    onClick={() => handleAnnotateTarget(target)}
                    disabled={addedIds.has(target.id)}
                    className={"flex items-center gap-1 h-7 px-2.5 rounded border text-[11px] font-semibold transition-colors " + (addedIds.has(target.id) ? "border-transparent bg-[var(--panel-muted)] text-[var(--text-muted)] opacity-60" : "border-[var(--border)] bg-[var(--panel-muted)] text-[var(--accent)] hover:bg-[var(--panel)] cursor-pointer")}
                  >
                    <BookmarkPlus size={12} />
                    {addedIds.has(target.id) ? "Annotated" : "Add Feature"}
                  </button>
                </div>
              </div>

              {/* Spacer + PAM Sequence Box */}
              <div className="p-2 rounded bg-[var(--bg-editor)] border border-[var(--border)] font-mono text-xs flex items-center justify-between">
                <div>
                  <span className="text-[var(--text)] tracking-wider font-semibold">{target.spacer}</span>
                  <span className="ml-2 font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-foreground)]">
                    {target.pam}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-sans">
                  Frameshift KO Likelihood: <strong className="text-[var(--text)] font-mono">{Math.round(target.frameshiftProbability * 100)}%</strong>
                </div>
              </div>

              {/* MMEJ Predicted Deletions */}
              {target.mmejDeletions.length > 0 && (
                <div className="text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="font-semibold text-[var(--text)] flex items-center gap-1">
                    <Sparkles size={11} className="text-[var(--accent)]" /> Predicted MMEJ Deletions:
                  </span>
                  {target.mmejDeletions.map((del, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--panel-muted)] border border-[var(--border)] font-mono text-[10px]">
                      -{del.deletionSizeBp}bp ({del.microhomology}) {del.isFrameshift ? "⚡Frameshift" : "In-frame"}
                    </span>
                  ))}
                </div>
              )}

              {/* Penalties if any */}
              {target.penalties.length > 0 && (
                <div className="text-[11px] text-[var(--warning)] flex flex-wrap items-center gap-2">
                  {target.penalties.map((p, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <AlertCircle size={11} /> {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
