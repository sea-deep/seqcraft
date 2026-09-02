
import { useEffect } from 'react';
import { useCloningStore } from '../../state/cloning-store';
import { approveRestrictionClone, cancelRestrictionClone } from '../../application/cloning';
import { X, AlertTriangle, GitBranch, Check } from 'lucide-react';

export function CloningApprovalModal() {
  const store = useCloningStore();
  const proposal = store.pendingProposal;

  useEffect(() => {
    if (!proposal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelRestrictionClone();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [proposal]);

  if (!proposal) return null;

  const candidate = proposal.candidates.find(c => c.id === store.selectedCandidateId);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-ui text-[13px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloning-proposal-title"
    >
      <div className="bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] rounded-lg shadow-2xl w-full max-w-[580px] flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in-0 zoom-in-95 duration-100">
        
        {/* Header */}
        <div className="border-b border-[var(--border)] px-5 py-3.5 flex items-center justify-between bg-[var(--panel-muted)]">
          <div className="flex items-center gap-2.5">
            <span className="size-8 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] grid place-items-center">
              <GitBranch size={17} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="cloning-proposal-title" className="font-semibold text-[15px] leading-tight text-[var(--text)]">
                  Restriction Cloning Proposal
                </h2>
                <span className="bg-[var(--bio-misc)]/15 text-[var(--bio-misc)] px-2 py-0.5 rounded text-[11px] font-medium">
                  Staged
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Review simulated construct before committing changes
              </p>
            </div>
          </div>
          <button 
            onClick={cancelRestrictionClone}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--bg)] rounded-md border border-[var(--border)] p-3">
              <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Vector</div>
              <div className="font-medium truncate text-[var(--text)]" title={proposal.vectorDocumentName}>{proposal.vectorDocumentName}</div>
              <div className="text-[12px] font-mono text-[var(--text-secondary)] mt-0.5">{proposal.vectorBackboneLengthBp.toLocaleString()} bp backbone</div>
            </div>
            
            <div className="bg-[var(--bg)] rounded-md border border-[var(--border)] p-3">
              <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Insert</div>
              <div className="font-medium truncate text-[var(--text)]" title={proposal.insertDocumentName}>{proposal.insertDocumentName}</div>
              <div className="text-[12px] font-mono text-[var(--text-secondary)] mt-0.5">{proposal.insertLengthBp.toLocaleString()} bp fragment</div>
            </div>
          </div>

          <div>
            <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Enzymes</div>
            <div className="flex flex-wrap gap-1.5">
              {proposal.enzymeNames.map(name => (
                <span key={name} className="px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-[12px] font-mono font-medium">
                  {name}
                </span>
              ))}
            </div>
          </div>

          {proposal.candidates.length > 1 && (
            <div>
              <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Orientation</div>
              <div className="flex gap-2">
                {proposal.candidates.map(c => (
                  <button
                    key={c.id}
                    onClick={() => store.selectCandidate(c.id)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors cursor-pointer ${
                      c.id === candidate?.id 
                        ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]' 
                        : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--panel-muted)]'
                    }`}
                  >
                    {c.orientation.charAt(0).toUpperCase() + c.orientation.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {candidate && (
            <div className="space-y-3 pt-1">
              <div className="border border-[var(--border)] rounded-md divide-y divide-[var(--border)] overflow-hidden">
                <div className="p-2.5 bg-[var(--bg)] flex justify-between items-center text-[12px]">
                  <span className="font-medium text-[var(--text)]">Junction 1</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${candidate.junction1.isCompatible ? 'bg-[var(--success)]/15 text-[var(--success)]' : 'bg-[var(--danger)]/15 text-[var(--danger)]'}`}>
                    {candidate.junction1.compatibilityMode}
                  </span>
                </div>
                <div className="p-2.5 bg-[var(--bg)] flex justify-between items-center text-[12px]">
                  <span className="font-medium text-[var(--text)]">Junction 2</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${candidate.junction2.isCompatible ? 'bg-[var(--success)]/15 text-[var(--success)]' : 'bg-[var(--danger)]/15 text-[var(--danger)]'}`}>
                    {candidate.junction2.compatibilityMode}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-[var(--accent-soft)] p-3.5 rounded-md border border-[var(--accent)]/30">
                <div className="font-medium text-[var(--accent)]">Predicted Recombinant</div>
                <div className="font-mono font-semibold text-[var(--text)]">{candidate.recombinantLengthBp.toLocaleString()} bp</div>
              </div>
              
              <div className="text-[12px] text-[var(--text-muted)] space-y-1">
                <div>Transferred features: {candidate.recombinantFeatures.length}</div>
                {(proposal.sourceMetadata.vectorFeaturesOmitted > 0 || proposal.sourceMetadata.insertFeaturesOmitted > 0) && (
                  <div className="text-[var(--warning)] flex items-center gap-1 text-[12px]">
                    <AlertTriangle size={14} />
                    Omitted {proposal.sourceMetadata.vectorFeaturesOmitted + proposal.sourceMetadata.insertFeaturesOmitted} features lost during digestion
                  </div>
                )}
              </div>
              
              {candidate.warnings.length > 0 && (
                <div className="bg-[var(--warning)]/10 p-3 rounded-md border border-[var(--warning)]/30 text-[12px]">
                  <div className="flex items-center gap-1.5 text-[var(--warning)] font-medium mb-1">
                    <AlertTriangle size={14} /> Warnings
                  </div>
                  <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-0.5">
                    {candidate.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[var(--panel-muted)] px-5 py-3.5 border-t border-[var(--border)] flex justify-end gap-2.5">
          <button
            onClick={cancelRestrictionClone}
            className="h-[34px] px-4 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] rounded-md border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-muted)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={approveRestrictionClone}
            disabled={!candidate?.isValid}
            className="h-[34px] px-4 text-[13px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            <Check size={14} /> Create recombinant
          </button>
        </div>

      </div>
    </div>
  );
}
