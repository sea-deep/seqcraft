import { useState, useMemo } from "react";
import { 
  Bot, Download, Copy, Check, FileCode, Beaker, Layers, ListChecks 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { 
  compileOpentronsPCRProtocol, 
  compileOpentronsDigestProtocol
} from "../../scientific/opentrons-compiler";
import type { OpentronsProtocolResult } from "../../scientific/opentrons-compiler";

export interface OpentronsExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "pcr" | "digest";
  pcrParams?: {
    templateDocName: string;
    forwardPrimerName: string;
    reversePrimerName: string;
    ampliconLengthBp: number;
    annealingTempC: number;
  };
  digestParams?: {
    dnaDocName: string;
    enzymeNames: string[];
  };
}

export function OpentronsExportDialog({
  open,
  onOpenChange,
  mode,
  pcrParams,
  digestParams
}: OpentronsExportDialogProps) {
  const [numReactions, setNumReactions] = useState(4);
  const [reactionVolumeUl, setReactionVolumeUl] = useState(50);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "bom" | "layout">("code");

  const protocolResult: OpentronsProtocolResult = useMemo(() => {
    if (mode === "pcr" && pcrParams) {
      return compileOpentronsPCRProtocol({
        ...pcrParams,
        numReactions,
        reactionVolumeUl
      });
    } else if (digestParams) {
      return compileOpentronsDigestProtocol({
        ...digestParams,
        numReactions,
        reactionVolumeUl
      });
    }
    return {
      pythonCode: "",
      filename: "protocol.py",
      reagentPlateMap: {},
      tubeRackMap: {},
      billOfMaterials: [],
      summary: ""
    };
  }, [mode, pcrParams, digestParams, numReactions, reactionVolumeUl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(protocolResult.pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([protocolResult.pythonCode], { type: "text/x-python;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = protocolResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[var(--panel)] border-[var(--border)]">
        <DialogHeader className="px-6 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[var(--text)]">
                  Opentrons (OT-2 / Flex) Robot Protocol
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--text-muted)]">
                  {protocolResult.summary}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2.5 text-xs gap-1.5"
              >
                {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Code"}
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="h-8 px-3 text-xs gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold hover:bg-[var(--accent-hover)]"
              >
                <Download size={14} /> Download .py
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Reaction Controls */}
        <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--panel-muted)] flex flex-wrap items-center gap-6 text-xs text-[var(--text)]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Reaction Count:</span>
            <input 
              type="number" 
              min={1} 
              max={96} 
              value={numReactions} 
              onChange={e => setNumReactions(Math.max(1, Math.min(96, Number(e.target.value) || 1)))}
              className="w-16 h-7 px-2 rounded border border-[var(--border)] bg-[var(--panel)] font-mono text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Reaction Vol (uL):</span>
            <input 
              type="number" 
              min={10} 
              max={100} 
              value={reactionVolumeUl} 
              onChange={e => setReactionVolumeUl(Math.max(10, Math.min(100, Number(e.target.value) || 50)))}
              className="w-16 h-7 px-2 rounded border border-[var(--border)] bg-[var(--panel)] font-mono text-center"
            />
          </div>
          <div role="group" aria-label="Protocol export view" className="flex-1 flex justify-end gap-1">
            <button
              aria-pressed={activeTab === "code"}
              onClick={() => setActiveTab("code")}
              className={"px-2.5 py-1 rounded text-xs font-medium transition-colors " + (activeTab === "code" ? "bg-[var(--panel)] shadow-sm text-[var(--accent)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
            >
              <FileCode size={13} className="inline mr-1" /> Python Code
            </button>
            <button
              aria-pressed={activeTab === "bom"}
              onClick={() => setActiveTab("bom")}
              className={"px-2.5 py-1 rounded text-xs font-medium transition-colors " + (activeTab === "bom" ? "bg-[var(--panel)] shadow-sm text-[var(--accent)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
            >
              <ListChecks size={13} className="inline mr-1" /> Reagents & BOM
            </button>
            <button
              aria-pressed={activeTab === "layout"}
              onClick={() => setActiveTab("layout")}
              className={"px-2.5 py-1 rounded text-xs font-medium transition-colors " + (activeTab === "layout" ? "bg-[var(--panel)] shadow-sm text-[var(--accent)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
            >
              <Layers size={13} className="inline mr-1" /> Deck Layout
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[350px] max-h-[480px]">
          {activeTab === "code" && (
            <div className="h-full">
              <pre className="p-4 rounded-lg bg-[var(--bg-editor)] border border-[var(--border)] font-mono text-[12px] text-[var(--text)] overflow-x-auto leading-relaxed">
                <code>{protocolResult.pythonCode}</code>
              </pre>
            </div>
          )}

          {activeTab === "bom" && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-muted)]">
                Bill of materials includes a 10% pipetting overage to account for dead volume in liquid handler aspirates.
              </p>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--panel-muted)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Reagent / Item</th>
                      <th className="px-4 py-2.5">Quantity Needed</th>
                      <th className="px-4 py-2.5">Deck Location / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-mono">
                    {protocolResult.billOfMaterials.map((item, i) => (
                      <tr key={i} className="hover:bg-[var(--panel-muted)]/50">
                        <td className="px-4 py-2.5 font-medium text-[var(--text)]">{item.item}</td>
                        <td className="px-4 py-2.5 text-[var(--accent)]">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-[var(--text-muted)] font-sans">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "layout" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                  <Beaker size={14} className="text-[var(--accent)]" /> 24-Tube Reagent Rack (Slot 6)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                  {Object.entries(protocolResult.tubeRackMap).map(([tube, reagent]) => (
                    <div key={tube} className="p-2 rounded border border-[var(--border)] bg-[var(--panel-muted)]">
                      <div className="font-bold text-[var(--accent)] mb-0.5">{tube}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-sans truncate" title={reagent}>
                        {reagent}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                  <Layers size={14} className="text-[var(--accent)]" /> 96-Well Reaction Plate (Slot 7)
                </h3>
                <div className="p-3 rounded border border-[var(--border)] bg-[var(--panel-muted)] text-xs text-[var(--text-muted)]">
                  {Object.keys(protocolResult.reagentPlateMap).length} reaction well(s) allocated:{" "}
                  <span className="font-mono font-semibold text-[var(--text)]">
                    {Object.keys(protocolResult.reagentPlateMap).join(", ")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
