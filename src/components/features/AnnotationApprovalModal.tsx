import type { Feature, FeatureType } from '../../domain/feature';
import { useActivityStore } from '../../state/activity-store';
import { useWorkspaceStore } from '../../state/workspace-store';

export interface AnnotationProposalPayload {
  feature: Feature;
}

export function AnnotationApprovalModal() {
  const proposal = useWorkspaceStore(state => state.stagedProposals.find(item => item.kind === 'annotation' && item.status === 'pending'));
  const addFeature = useWorkspaceStore(state => state.addFeature);
  const removeProposal = useWorkspaceStore(state => state.removeProposal);
  if (!proposal) return null;
  const payload = proposal.payload as AnnotationProposalPayload;
  const feature = payload.feature;
  const decide = (approve: boolean) => {
    if (approve) addFeature(proposal.documentId, feature);
    removeProposal(proposal.id);
    useActivityStore.getState().addEvent({ toolName: approve ? 'human_approve_annotation' : 'human_reject_annotation', inputSummary: feature.name, status: 'success', resultSummary: approve ? `Added ${feature.name}` : `Rejected ${feature.name}` });
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-[480px] rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-xl">
        <div className="border-b border-[var(--border)] px-4 py-3"><div className="font-semibold">Review agent annotation</div><div className="text-[11px] text-[var(--text-muted)]">No document change occurs until you approve.</div></div>
        <div className="grid grid-cols-[100px_1fr] gap-y-2 p-4 text-[12px]"><span className="text-[var(--text-muted)]">Name</span><span className="font-medium">{feature.name}</span><span className="text-[var(--text-muted)]">Type</span><span>{feature.type as FeatureType}</span><span className="text-[var(--text-muted)]">Coordinates</span><span className="font-mono">{feature.segments.map(segment => `${segment.start0 + 1}–${segment.end0Exclusive}`).join(', ')}</span><span className="text-[var(--text-muted)]">Strand</span><span>{feature.strand === 1 ? 'Forward' : 'Reverse'}</span></div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3"><button onClick={() => decide(false)} className="h-[34px] rounded-md border border-[var(--border)] px-3">Reject</button><button onClick={() => decide(true)} className="h-[34px] rounded-md bg-[var(--accent)] px-3 font-medium text-white">Apply annotation</button></div>
      </div>
    </div>
  );
}
