import { useMemo, useState } from "react";
import { 
  ShieldCheck, ShieldAlert, AlertOctagon, Download, Check, Info, Copy 
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
import { screenBiosecurity } from "../../scientific/biosecurity";
import type { BiosecurityScreeningReport } from "../../scientific/biosecurity";
import { getMemorySequence } from "../../utils/document-utils";

export interface BiosecurityDialogProps {
  document: SequenceDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BiosecurityDialog({
  document,
  open,
  onOpenChange
}: BiosecurityDialogProps) {
  const [copied, setCopied] = useState(false);

  const report: BiosecurityScreeningReport = useMemo(() => {
    const raw = getMemorySequence(document).raw;
    return screenBiosecurity(raw, document.topology);
  }, [document]);

  const handleExportReport = () => {
    const diagnostic = {
      seqcraftLocalBiosecurityScreen: {
        timestamp: new Date().toISOString(),
        documentName: document.name,
        sequenceLengthBp: document.length,
        topology: document.topology,
        screeningStatus: report.status,
        hasLocalReferenceMatch: !report.isCompliant,
        matchCount: report.matchCount,
        referenceCoverage: "17 curated diagnostic k-mers associated with selected controlled-agent examples",
        disclaimer: "This local motif pre-screen is not a regulatory compliance determination and does not replace provider or institutional screening.",
        matches: report.matches,
        recommendation: report.recommendation
      }
    };

    const blob = new Blob([JSON.stringify(diagnostic, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = document.name + "-biosecurity-local-screen.json";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = async () => {
    const text = "SeqCraft Local Biosecurity Motif Pre-Screen\n" +
      "Document: " + document.name + " (" + document.length + " bp)\n" +
      "Status: " + report.status + "\n" +
      "Summary: " + report.summary + "\n" +
      "Recommendation: " + report.recommendation;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[740px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-[var(--panel)] border-[var(--border)]">
        <DialogHeader className="px-6 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + (report.isCompliant ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--danger)]/15 text-[var(--danger)]")}>
                {report.isCompliant ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                  Local Biosecurity Motif Pre-Screen
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--text-muted)]">
                  Checks 17 curated diagnostic k-mers locally. It is not a regulatory or synthesis-provider compliance determination.
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-start">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReport}
                className="h-8 px-2.5 text-xs gap-1.5"
              >
                {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Report"}
              </Button>
              <Button
                size="sm"
                onClick={handleExportReport}
                className="h-8 px-3 text-xs gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold hover:bg-[var(--accent-hover)]"
              >
                <Download size={14} /> Export Report
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Status Banner */}
          <div className={"p-4 rounded-xl border flex items-start gap-3.5 " + (report.isCompliant ? "bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--text)]" : "bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--text)]")}>
            <div className="mt-0.5">
              {report.isCompliant ? (
                <ShieldCheck size={20} className="text-[var(--success)]" />
              ) : (
                <AlertOctagon size={20} className="text-[var(--danger)]" />
              )}
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>{report.status === "NO_LOCAL_MATCH" ? "No Local Reference Matches Found" : report.status === "TIER_1_CRITICAL" ? "Tier 1 Select Agent Warning" : "Controlled Sequence Detected"}</span>
                <span className={"px-2 py-0.5 rounded text-[10px] font-bold font-mono " + (report.isCompliant ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--danger)]/20 text-[var(--danger)]")}>
                  {report.status}
                </span>
              </div>
              <p className="text-[var(--text-secondary)]">{report.summary}</p>
              <div className="pt-1 font-medium text-[var(--text)] flex items-center gap-1.5">
                <Info size={13} className="text-[var(--accent)]" /> {report.recommendation}
              </div>
            </div>
          </div>

          {/* Local reference coverage */}
          <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] text-xs space-y-2">
            <span className="font-semibold text-[var(--text)] block">Local diagnostic coverage:</span>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              The browser compares nucleotide sequence against 17 curated k-mer examples associated with selected controlled agents and toxins. A match is a review signal; no match is not clearance. Commercial providers and institutions use broader nucleotide, translated-protein, customer, and end-use screening.
            </p>
          </div>

          {/* Flagged Sequences Table if any */}
          {report.matches.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-[var(--text)]">
                Diagnostic Sequence Matches ({report.matches.length}):
              </span>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden font-mono text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[var(--panel-muted)] border-b border-[var(--border)] text-[var(--text-muted)] text-[10px] uppercase">
                    <tr>
                      <th className="px-3 py-2">Agent Name</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Coordinates</th>
                      <th className="px-3 py-2">Provider Action Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {report.matches.map((m, i) => (
                      <tr key={i} className="hover:bg-[var(--panel-muted)]/50">
                        <td className="px-3 py-2.5 font-sans font-medium text-[var(--text)]">{m.agentName}</td>
                        <td className="px-3 py-2.5 font-sans">
                          <span className="px-1.5 py-0.5 rounded bg-[var(--danger)]/15 text-[var(--danger)] text-[10px] font-bold">
                            {m.category}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[var(--accent)] font-bold">{m.start0 + 1}–{m.end0Exclusive} ({m.strand === 1 ? "+" : "-"})</td>
                        <td className="px-3 py-2.5 font-sans text-[var(--text-secondary)] text-[11px]">{m.providerAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
