import { useState, useMemo } from "react";
import { 
  Dna, Plus, Trash2, ArrowUp, ArrowDown, CheckCircle2, AlertTriangle, Wand2, Sparkles 
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
import { 
  TYPE_IIS_ENZYMES, 
  assembleGoldenGate, 
  domesticateSequence, 
  digestPartWithTypeIIS 
} from "../../scientific/golden-gate";
import type { TypeIISEnzyme } from "../../scientific/golden-gate";
import { getMemorySequence } from "../../utils/document-utils";
import { useWorkspaceStore } from "../../state/workspace-store";
import { ScientificSequence } from "../../scientific/nucleotide";
import { generateId } from "../../utils/id";

export interface GoldenGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeDocument: SequenceDocument;
  documents: SequenceDocument[];
}

export function GoldenGateDialog({
  open,
  onOpenChange,
  activeDocument,
  documents
}: GoldenGateDialogProps) {
  const [selectedEnzymeId, setSelectedEnzymeId] = useState("bsai");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([activeDocument.id]);
  const [activeTab, setActiveTab] = useState<"assembly" | "domestication">("assembly");
  const [domesticatedDoc, setDomesticatedDoc] = useState<string | null>(null);

  const addDocument = useWorkspaceStore(s => s.addDocument);
  const setActiveDocument = useWorkspaceStore(s => s.setActiveDocument);
  const addHistoryEntry = useWorkspaceStore(s => s.addHistoryEntry);

  const enzyme: TypeIISEnzyme = useMemo(() => {
    return TYPE_IIS_ENZYMES.find(e => e.id === selectedEnzymeId) || TYPE_IIS_ENZYMES[0];
  }, [selectedEnzymeId]);

  // Convert selected documents into GoldenGateParts
  const parts = useMemo(() => {
    return selectedDocIds
      .map(id => documents.find(d => d.id === id))
      .filter((d): d is SequenceDocument => Boolean(d))
      .map(d => ({
        id: d.id,
        name: d.name,
        sequence: getMemorySequence(d).raw,
        features: d.features
      }));
  }, [selectedDocIds, documents]);

  // Run assembly simulation
  const assemblyResult = useMemo(() => {
    if (parts.length < 2) return null;
    return assembleGoldenGate(parts, enzyme, "circular");
  }, [parts, enzyme]);

  // Domestication analysis on active document
  const domestication = useMemo(() => {
    const raw = getMemorySequence(activeDocument).raw;
    return domesticateSequence(raw, enzyme, 1);
  }, [activeDocument, enzyme]);

  const handleMovePart = (index: number, direction: "up" | "down") => {
    const newIds = [...selectedDocIds];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newIds.length) return;
    const temp = newIds[index];
    newIds[index] = newIds[targetIdx];
    newIds[targetIdx] = temp;
    setSelectedDocIds(newIds);
  };

  const handleRemovePart = (id: string) => {
    setSelectedDocIds(prev => prev.filter(x => x !== id));
  };

  const handleAddPart = (id: string) => {
    if (!selectedDocIds.includes(id)) {
      setSelectedDocIds(prev => [...prev, id]);
    }
  };

  const handleCreateRecombinant = () => {
    if (!assemblyResult || !assemblyResult.success) return;

    const newDoc: SequenceDocument = {
      id: generateId(),
      name: "GoldenGate-" + parts.map(p => p.name).join("-").slice(0, 30),
      length: assemblyResult.recombinantSequence.length,
      topology: "circular",
      alphabet: "DNA",
      storageMode: "memory",
      sequence: new ScientificSequence(assemblyResult.recombinantSequence, "DNA"),
      features: assemblyResult.assembledFeatures,
      primers: [],
      source: "cloning_preview",
      version: 1
    };

    addDocument(newDoc);
    setActiveDocument(newDoc.id);
    addHistoryEntry({
      documentId: newDoc.id,
      action: "created",
      summary: "Created Golden Gate assembly construct using " + enzyme.name
    });
    onOpenChange(false);
  };

  const handleApplyDomestication = () => {
    if (!domestication.hasInternalSites) return;

    const newDoc: SequenceDocument = {
      id: generateId(),
      name: activeDocument.name + "-domesticated",
      length: domestication.domesticatedSequence.length,
      topology: activeDocument.topology,
      alphabet: "DNA",
      storageMode: "memory",
      sequence: new ScientificSequence(domestication.domesticatedSequence, "DNA"),
      features: activeDocument.features,
      primers: activeDocument.primers,
      source: "cloning_preview",
      version: 1
    };

    addDocument(newDoc);
    setActiveDocument(newDoc.id);
    addHistoryEntry({
      documentId: newDoc.id,
      action: "created",
      summary: "Domesticated " + domestication.siteCount + " internal " + enzyme.name + " sites"
    });
    setDomesticatedDoc(newDoc.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-[var(--panel)] border-[var(--border)]">
        <DialogHeader className="px-6 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
                <Dna size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[var(--text)]">
                  Type IIS Golden Gate Assembly & Domesticator
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--text-muted)]">
                  Scarless multi-part directional assembly and synonymous codon mutation engine.
                </DialogDescription>
              </div>
            </div>

            {/* Enzyme Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">Type IIS:</span>
              <select
                value={selectedEnzymeId}
                onChange={e => setSelectedEnzymeId(e.target.value)}
                className="h-8 px-2 rounded border border-[var(--border)] bg-[var(--panel-muted)] font-mono text-xs font-semibold text-[var(--text)]"
              >
                {TYPE_IIS_ENZYMES.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.recognitionSequence})</option>
                ))}
              </select>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="px-6 py-2 border-b border-[var(--border)] bg-[var(--panel-muted)] flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab("assembly")}
            className={"px-3 py-1 rounded font-medium transition-colors cursor-pointer " + (activeTab === "assembly" ? "bg-[var(--panel)] shadow-sm text-[var(--accent)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
          >
            Multi-Part Assembly ({parts.length} parts)
          </button>
          <button
            onClick={() => setActiveTab("domestication")}
            className={"px-3 py-1 rounded font-medium transition-colors cursor-pointer " + (activeTab === "domestication" ? "bg-[var(--panel)] shadow-sm text-[var(--accent)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
          >
            Domestication Optimizer {domestication.hasInternalSites && <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] font-mono text-[10px]">{domestication.siteCount}</span>}
          </button>
        </div>

        {/* Tab 1: Assembly */}
        {activeTab === "assembly" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[350px]">
            {/* Parts List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium px-1">
                <span>Assembly Parts in Order (5' → 3' Directional Chain)</span>
                <span>Select from Workspace</span>
              </div>

              {parts.map((p, idx) => {
                const dig = digestPartWithTypeIIS(p, enzyme);
                return (
                  <div 
                    key={p.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] flex items-center justify-between gap-3 text-xs shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-[var(--panel-muted)] text-[var(--text-muted)] flex items-center justify-center font-mono font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-[var(--text)]">{p.name}</div>
                        <div className="font-mono text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                          {dig.success && dig.digested ? (
                            <>
                              <span>Left: <strong className="text-[var(--accent)] font-bold">{dig.digested.leftOverhang}</strong></span>
                              <span>•</span>
                              <span>Right: <strong className="text-[var(--accent)] font-bold">{dig.digested.rightOverhang}</strong></span>
                              <span>•</span>
                              <span>Body: {dig.digested.bodySequence.length} bp</span>
                            </>
                          ) : (
                            <span className="text-[var(--danger)] flex items-center gap-1">
                              <AlertTriangle size={11} /> {dig.error || "Missing sites"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleMovePart(idx, "up")} 
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-[var(--panel-muted)] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button 
                        onClick={() => handleMovePart(idx, "down")} 
                        disabled={idx === parts.length - 1}
                        className="p-1 rounded hover:bg-[var(--panel-muted)] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button 
                        onClick={() => handleRemovePart(p.id)}
                        className="p-1 rounded hover:bg-[var(--danger)]/10 text-[var(--danger)] cursor-pointer ml-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add Available Docs */}
              <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-[var(--text-muted)] mr-1">Add part:</span>
                {documents.filter(d => !selectedDocIds.includes(d.id)).map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleAddPart(doc.id)}
                    className="h-6 px-2 rounded-full border border-[var(--border)] bg-[var(--panel-muted)] text-[11px] hover:border-[var(--accent)] hover:text-[var(--text)] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={11} /> {doc.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Junction Validation Report */}
            {parts.length >= 2 && (
              <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                    {assemblyResult?.success ? (
                      <CheckCircle2 size={14} className="text-[var(--success)]" />
                    ) : (
                      <AlertTriangle size={14} className="text-[var(--danger)]" />
                    )}
                    Junction Compatibility Analysis
                  </span>
                  {assemblyResult?.success && (
                    <span className="font-mono text-[11px] text-[var(--accent)] font-bold">
                      {assemblyResult.recombinantSequence.length.toLocaleString()} bp circular construct
                    </span>
                  )}
                </div>

                {assemblyResult?.errorMessage && (
                  <p className="text-xs text-[var(--danger)]">{assemblyResult.errorMessage}</p>
                )}

                {assemblyResult?.junctions && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    {assemblyResult.junctions.map((j, i) => (
                      <div key={i} className="p-2 rounded border border-[var(--border)] bg-[var(--panel)] flex items-center justify-between">
                        <span className="font-sans text-[var(--text-muted)] truncate max-w-[140px]">{j.upstreamPartName} → {j.downstreamPartName}</span>
                        <span className="font-bold text-[var(--accent)] px-1.5 py-0.5 rounded bg-[var(--panel-muted)]">
                          {j.overhang}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Domestication */}
        {activeTab === "domestication" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[350px]">
            <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--panel-muted)] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[var(--accent)]" />
                  {domestication.hasInternalSites ? "Internal Sites Found" : "Sequence Already Domesticated"}
                </span>
                <span className="font-mono font-bold text-[var(--text)]">{activeDocument.name}</span>
              </div>
              <p className="text-[var(--text-muted)]">{domestication.summary}</p>
            </div>

            {domestication.hasInternalSites && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-[var(--text-muted)] px-1">
                  Proposed Synonymous Single-Nucleotide Substitutions
                </div>
                <div className="border border-[var(--border)] rounded-lg overflow-hidden font-mono text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[var(--panel-muted)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Position</th>
                        <th className="px-3 py-2">Mutation</th>
                        <th className="px-3 py-2">Codon Change</th>
                        <th className="px-3 py-2">Amino Acid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {domestication.mutations.map((m, i) => (
                        <tr key={i} className="hover:bg-[var(--panel-muted)]/50">
                          <td className="px-3 py-2 font-bold">{m.position1}</td>
                          <td className="px-3 py-2 text-[var(--accent)] font-semibold">{m.originalBase} → {m.mutatedBase}</td>
                          <td className="px-3 py-2">{m.originalCodon} → <strong className="text-[var(--accent)]">{m.mutatedCodon}</strong></td>
                          <td className="px-3 py-2 font-sans font-medium text-[var(--text)]">{m.aminoAcid} (Preserved)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleApplyDomestication}
                    className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold hover:bg-[var(--accent-hover)]"
                  >
                    <Wand2 size={13} /> Apply Silent Mutations to New Document
                  </Button>
                </div>
                {domesticatedDoc && (
                  <p className="text-xs text-[var(--success)] text-right font-medium">
                    Created and loaded: {domesticatedDoc}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {activeTab === "assembly" && (
          <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--bg)] flex items-center justify-between shrink-0">
            <span className="text-xs text-[var(--text-muted)]">
              {assemblyResult?.success ? "All junctions verified and scarless" : "Add compatible parts to assemble"}
            </span>
            <Button
              size="sm"
              disabled={!assemblyResult || !assemblyResult.success}
              onClick={handleCreateRecombinant}
              className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold hover:bg-[var(--accent-hover)] cursor-pointer"
            >
              <Dna size={14} /> Assemble & Create Plasmid
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
