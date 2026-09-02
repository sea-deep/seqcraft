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
                No document change occurs until you approve.
              </p>
            </div>
          </div>
          <button 
            onClick={() => decide(false)}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-[90px_1fr] gap-y-2.5 p-5 text-[12px]">
          <span className="text-[var(--text-muted)]">Name</span>
          <span className="font-medium text-[var(--text)] flex items-center gap-2">
            <span className="inline-block size-2 rounded-full" style={{ backgroundColor: getFeatureColor(feature.type as FeatureType) }} />
            {feature.name}
          </span>

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
            className="h-[34px] px-4 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check size={14} /> Apply annotation
          </button>
        </div>
      </div>
    </div>
  );
}
