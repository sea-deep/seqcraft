import { useState, useMemo } from "react";
import { 
  Sparkles, PlusCircle, RefreshCw, Replace, 
  Check, AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import type { SequenceDocument } from "../../domain/document";
import { useWorkspaceStore } from "../../state/workspace-store";
import { COMMON_BIO_MOTIFS as motifs } from "../../scientific/sequence-editing";

export interface SequenceMutatorDialogProps {
  document: SequenceDocument;
  initialMode?: "insert" | "replace" | "rotate_origin";
  selection?: { start0: number; end0Exclusive: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SequenceMutatorDialog({
  document,
  initialMode = "insert",
  selection,
  open,
  onOpenChange
}: SequenceMutatorDialogProps) {
  const [mode, setMode] = useState<"insert" | "replace" | "rotate_origin">(initialMode);
  const [insertPos, setInsertPos] = useState<number>(selection ? selection.start0 + 1 : 1);
  const [customSequence, setCustomSequence] = useState<string>("");
  const [selectedMotifName, setSelectedMotifName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutateDocumentSequence = useWorkspaceStore(s => s.mutateDocumentSequence);

  const activeSeq = useMemo(() => {
    return selectedMotifName 
      ? (motifs.find(m => m.name === selectedMotifName)?.sequence || customSequence)
      : customSequence;
  }, [selectedMotifName, customSequence]);

  const handleSelectMotif = (motifName: string) => {
    if (selectedMotifName === motifName) {
      setSelectedMotifName("");
    } else {
      setSelectedMotifName(motifName);
      const m = motifs.find(item => item.name === motifName);
      if (m) setCustomSequence(m.sequence);
    }
  };

  const handleExecute = () => {
    setErrorMsg(null);
    try {
      if (mode === "insert") {
        if (!activeSeq.trim()) {
          setErrorMsg("Please enter a DNA sequence or select a motif.");
          return;
        }
        mutateDocumentSequence(document.id, {
          type: "insert",
          index0: insertPos - 1,
          sequence: activeSeq.trim()
        });
      } else if (mode === "replace") {
        if (!selection) {
          setErrorMsg("Please select a sequence range to replace.");
          return;
        }
        if (!activeSeq.trim()) {
          setErrorMsg("Please enter replacement bases or select a motif.");
          return;
        }
        mutateDocumentSequence(document.id, {
          type: "replace",
          start0: selection.start0,
          end0Exclusive: selection.end0Exclusive,
          replacement: activeSeq.trim()
        });
      } else if (mode === "rotate_origin") {
        const originIndex0 = selection ? selection.start0 : insertPos - 1;
        mutateDocumentSequence(document.id, {
          type: "rotate_origin",
          newOrigin0: originIndex0
        });
      }
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute sequence modification");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-[var(--panel)] border-[var(--border)]">
        <DialogHeader className="px-6 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center font-bold">
              <Sparkles size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[var(--text)]">
                {mode === "insert" ? "Insert DNA / Standard Motifs" : mode === "replace" ? "Mutate & Replace Bases" : "Rotate Circular Origin"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-muted)]">
                In-place sequence engineering with automatic biological feature coordinate shifting.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--panel-muted)] rounded-lg border border-[var(--border)] text-xs font-medium">
            <button
              onClick={() => { setMode("insert"); setErrorMsg(null); }}
              className={"flex-1 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer " + (mode === "insert" ? "bg-[var(--panel)] text-[var(--text)] shadow-xs font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
            >
              <PlusCircle size={14} /> Insert Bases
            </button>
            <button
              onClick={() => { setMode("replace"); setErrorMsg(null); }}
              className={"flex-1 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer " + (mode === "replace" ? "bg-[var(--panel)] text-[var(--text)] shadow-xs font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
            >
              <Replace size={14} /> Replace Selection
            </button>
            {document.topology === "circular" && (
              <button
                onClick={() => { setMode("rotate_origin"); setErrorMsg(null); }}
                className={"flex-1 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer " + (mode === "rotate_origin" ? "bg-[var(--panel)] text-[var(--text)] shadow-xs font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
              >
                <RefreshCw size={14} /> Rotate Origin
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          {mode === "rotate_origin" ? (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] space-y-2">
                <span className="font-semibold text-[var(--text)] block">Circular Coordinate Re-Indexing</span>
                <p className="text-[var(--text-secondary)]">
                  Rotates the 0-origin of this circular plasmid ({document.length} bp) so that coordinate <strong>{selection ? selection.start0 + 1 : insertPos}</strong> becomes Position 1.
                </p>
                <p className="text-[var(--text-muted)] text-[11px]">
                  All circular features spanning the breakpoint will be automatically partitioned into canonical origin segments.
                </p>
              </div>

              {!selection && (
                <div className="space-y-1">
                  <label className="text-[var(--text-muted)] font-medium">New Position 1 Coordinate (1..{document.length}):</label>
                  <input
                    type="number"
                    min={1}
                    max={document.length}
                    value={insertPos}
                    onChange={(e) => setInsertPos(Math.max(1, Math.min(document.length, parseInt(e.target.value) || 1)))}
                    className="w-full h-8 px-3 rounded-md bg-[var(--bg)] border border-[var(--border)] font-mono text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Target Location / Coordinate */}
              <div className="space-y-1">
                <label className="text-[var(--text-muted)] font-medium">
                  {mode === "insert" ? "Insert At Coordinate (1-based):" : "Target Selection Range:"}
                </label>
                {mode === "insert" ? (
                  <input
                    type="number"
                    min={1}
                    max={document.length + 1}
                    value={insertPos}
                    onChange={(e) => setInsertPos(Math.max(1, Math.min(document.length + 1, parseInt(e.target.value) || 1)))}
                    className="w-full h-8 px-3 rounded-md bg-[var(--bg)] border border-[var(--border)] font-mono text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                ) : (
                  <div className="h-8 px-3 rounded-md bg-[var(--bg)] border border-[var(--border)] font-mono flex items-center text-[var(--accent)] font-semibold">
                    {selection ? `${selection.start0 + 1}–${selection.end0Exclusive} (${selection.end0Exclusive - selection.start0} bp)` : "No active selection in sequence viewer"}
                  </div>
                )}
              </div>

              {/* Standard Motifs Catalog */}
              <div className="space-y-1.5">
                <label className="text-[var(--text-muted)] font-medium flex items-center justify-between">
                  <span>Standard Biological Motifs:</span>
                  <span className="text-[10px] text-[var(--accent)]">Click to fill</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {motifs.map(m => {
                    const active = selectedMotifName === m.name;
                    return (
                      <button
                        key={m.name}
                        onClick={() => handleSelectMotif(m.name)}
                        className={"p-2 rounded-lg border text-left transition-all cursor-pointer " + (active ? "bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--text)]" : "bg-[var(--panel-muted)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]")}
                      >
                        <div className="font-semibold text-[11px] truncate flex items-center justify-between">
                          <span>{m.name}</span>
                          {active && <Check size={12} className="text-[var(--accent)]" />}
                        </div>
                        <div className="text-[9px] text-[var(--text-muted)] truncate">{m.category}</div>
                        <div className="text-[9px] font-mono text-[var(--accent)] mt-0.5 truncate">{m.sequence.length} bp</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Sequence Input */}
              <div className="space-y-1">
                <label className="text-[var(--text-muted)] font-medium flex items-center justify-between">
                  <span>Sequence Bases (IUPAC DNA):</span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">{customSequence.replace(/\s+/g, "").length} bp</span>
                </label>
                <textarea
                  rows={3}
                  value={customSequence}
                  onChange={(e) => {
                    setCustomSequence(e.target.value.toUpperCase());
                    setSelectedMotifName("");
                  }}
                  placeholder="e.g. ATGCGATCGATC..."
                  className="w-full p-2.5 rounded-md bg-[var(--bg)] border border-[var(--border)] font-mono text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] uppercase resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--panel-muted)] flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 px-3 text-xs">
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleExecute}
            className="h-8 px-4 text-xs font-semibold bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] shadow-xs"
          >
            {mode === "insert" ? "Insert Bases" : mode === "replace" ? "Replace Bases" : "Rotate Origin"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
