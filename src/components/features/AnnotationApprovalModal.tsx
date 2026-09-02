import { useEffect } from 'react';
import type { Feature, FeatureType } from '../../domain/feature';
import { getFeatureColor } from '../../domain/feature-colors';
import { useActivityStore } from '../../state/activity-store';
import { useWorkspaceStore } from '../../state/workspace-store';
import { Check, Sparkles, X } from 'lucide-react';

export interface AnnotationProposalPayload {
  feature: Feature;
}

export function AnnotationApprovalModal() {
  const proposal = useWorkspaceStore(state => state.stagedProposals.find(item => item.kind === 'annotation' && item.status === 'pending'));
  const addFeature = useWorkspaceStore(state => state.addFeature);
  const removeProposal = useWorkspaceStore(state => state.removeProposal);
  const documents = useWorkspaceStore(state => state.documents);

  const targetDoc = proposal ? documents.find(d => d.id === proposal.documentId) : null;
  const isStale = Boolean(
    targetDoc && (
      (proposal?.baseVersion !== undefined && targetDoc.version !== proposal.baseVersion) ||
      (proposal?.sequenceLength !== undefined && targetDoc.length !== proposal.sequenceLength)
    )
  );

  const decide = (approve: boolean) => {
    if (!proposal) return;
    const payload = proposal.payload as AnnotationProposalPayload;
    const feature = payload.feature;
    if (approve) addFeature(proposal.documentId, feature);
    removeProposal(proposal.id);
    useActivityStore.getState().addEvent({ 
      toolName: approve ? 'human_approve_annotation' : 'human_reject_annotation', 
      inputSummary: feature.name, 
      status: 'success', 
      resultSummary: approve ? `Added ${feature.name}` : `Rejected ${feature.name}` 
    });
  };

  useEffect(() => {
    if (!proposal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        decide(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [proposal]);

  if (!proposal) return null;
  const payload = proposal.payload as AnnotationProposalPayload;
  const feature = payload.feature;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-ui text-[13px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="annotation-proposal-title"
    >
      <div className="w-full max-w-[480px] rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-2xl text-[var(--text)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
        <div className="border-b border-[var(--border)] px-5 py-3.5 flex items-center justify-between bg-[var(--panel-muted)]">
          <div className="flex items-center gap-2.5">
            <span className="size-8 rounded-md bg-[var(--bio-misc)]/15 text-[var(--bio-misc)] grid place-items-center">
              <Sparkles size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="annotation-proposal-title" className="font-semibold text-[15px] leading-tight text-[var(--text)]">
                  Review Agent Annotation
                </h2>
                <span className="bg-[var(--bio-misc)]/15 text-[var(--bio-misc)] px-2 py-0.5 rounded text-[11px] font-medium">
                  Staged
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Review metadata before committing to workspace document.
              </p>
            </div>
          </div>
          <button 
            onClick={() => decide(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded hover:bg-[var(--border)] cursor-pointer"
            title="Reject proposal (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {isStale && (
          <div className="mx-5 mt-4 rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-[12px] text-[var(--danger)] space-y-1">
            <div className="font-semibold">Stale Annotation Proposal</div>
            <p>The document sequence has changed since this annotation was proposed (v{proposal?.baseVersion} → v{targetDoc?.version}). Reject and re-run.</p>
          </div>
        )}

        <div className="p-5 grid grid-cols-[100px_1fr] gap-y-2.5 text-xs">
          <span className="text-[var(--text-muted)]">Target</span>
          <span className="font-mono text-[var(--text)] font-semibold">{targetDoc?.name || proposal.documentId}</span>

          <span className="text-[var(--text-muted)]">Feature name</span>
          <div className="flex items-center gap-2">
            <span 
              className="size-2 rounded-full" 
              style={{ backgroundColor: getFeatureColor(feature.type as FeatureType) }}
            />
            <span className="font-medium text-[var(--text)]">{feature.name}</span>
          </div>

          <span className="text-[var(--text-muted)]">Type</span>
          <span className="capitalize text-[var(--text)]">{feature.type}</span>

          <span className="text-[var(--text-muted)]">Coordinates</span>
          <span className="font-mono text-[var(--text)]">
            {feature.segments.map(segment => `${segment.start0 + 1}–${segment.end0Exclusive}`).join(', ')}
          </span>

          <span className="text-[var(--text-muted)]">Strand</span>
          <span className="text-[var(--text)]">{feature.strand === 1 ? 'Forward (+)' : 'Reverse (-)'}</span>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-[var(--border)] bg-[var(--panel-muted)] px-5 py-3.5">
          <button 
            onClick={() => decide(false)} 
            className="h-[34px] px-4 rounded-md border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-muted)] text-[var(--text-muted)] hover:text-[var(--text)] font-medium transition-colors cursor-pointer"
          >
            Reject
          </button>
          <button 
            onClick={() => decide(true)} 
            disabled={isStale}
            className={`h-[34px] px-4 rounded-md font-semibold text-[13px] transition-colors flex items-center gap-1.5 shadow-sm ${isStale ? 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed opacity-50' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] cursor-pointer'}`}
          >
            <Check size={14} /> Apply annotation
          </button>
        </div>
      </div>
    </div>
  );
}
