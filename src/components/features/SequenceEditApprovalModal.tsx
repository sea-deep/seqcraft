import { useEffect } from 'react';
import { useWorkspaceStore } from '../../state/workspace-store';
import { useActivityStore } from '../../state/activity-store';
import type { SequenceEditProposalPayload } from '../../domain/proposal';
import { Check, Edit3, RotateCw, Trash2, ArrowRightLeft, PlusCircle, X } from 'lucide-react';

export function SequenceEditApprovalModal() {
  const proposal = useWorkspaceStore(state => 
    state.stagedProposals?.find(item => item.kind === 'sequence_edit' && item.status === 'pending')
  );
  const mutateDocumentSequence = useWorkspaceStore(state => state.mutateDocumentSequence);
  const removeProposal = useWorkspaceStore(state => state.removeProposal);
  const documents = useWorkspaceStore(state => state.documents);

  const payload = proposal ? (proposal.payload as SequenceEditProposalPayload) : null;
  const targetDoc = proposal ? documents.find(d => d.id === proposal.documentId) : null;

  const decide = (approve: boolean) => {
    if (!proposal || !payload) return;
    if (approve) {
      mutateDocumentSequence(proposal.documentId, payload.action);
    }
    removeProposal(proposal.id);
    useActivityStore.getState().addEvent({
      toolName: approve ? 'human_approve_sequence_edit' : 'human_reject_sequence_edit',
      inputSummary: payload.summary,
      status: 'success',
      resultSummary: approve ? `Applied: ${payload.summary}` : `Rejected: ${payload.summary}`
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

  if (!proposal || !payload) return null;

  const getActionIcon = () => {
    switch (payload.action.type) {
      case 'insert': return <PlusCircle size={16} className="text-[var(--accent)]" />;
      case 'delete': return <Trash2 size={16} className="text-[var(--danger)]" />;
      case 'replace': return <Edit3 size={16} className="text-[var(--bio-cds)]" />;
      case 'reverse_complement': return <ArrowRightLeft size={16} className="text-[var(--bio-promoter)]" />;
      case 'rotate_origin': return <RotateCw size={16} className="text-[var(--bio-origin)]" />;
    }
  };

  const getActionTitle = () => {
    switch (payload.action.type) {
      case 'insert': return 'Insert Bases / Motif';
      case 'delete': return 'Delete Sequence Range';
      case 'replace': return 'Replace Sequence Range';
      case 'reverse_complement': return 'Reverse Complement In-Place';
      case 'rotate_origin': return 'Rotate Circular Plasmid Origin';
    }
  };

  const isStale = Boolean(
    targetDoc && (
      (proposal?.baseVersion !== undefined && targetDoc.version !== proposal.baseVersion) ||
      (proposal?.sequenceLength !== undefined && targetDoc.length !== proposal.sequenceLength)
    )
  );

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-ui text-[13px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sequence-edit-proposal-title"
    >
      <div className="w-full max-w-[500px] rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-2xl text-[var(--text)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
        <div className="border-b border-[var(--border)] px-5 py-3.5 flex items-center justify-between bg-[var(--panel-muted)]">
          <div className="flex items-center gap-2.5">
            <span className="size-8 rounded-md bg-[var(--bio-origin)]/15 text-[var(--bio-origin)] grid place-items-center">
              {getActionIcon()}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="sequence-edit-proposal-title" className="font-semibold text-[14px]">
                  Agent Proposal: Sequence Mutation
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                  Stage & Gate
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Autonomous agent requested direct plasmid modification. Human approval required.
              </p>
            </div>
          </div>
          <button
            onClick={() => decide(false)}
            className="size-7 rounded-md hover:bg-[var(--panel)] text-[var(--text-muted)] hover:text-[var(--text)] grid place-items-center transition-colors cursor-pointer"
            title="Reject proposal (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isStale && (
            <div className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-[12px] text-[var(--danger)] space-y-1">
              <div className="font-semibold">Stale Proposal Detected</div>
              <p>The document sequence has changed since this edit was staged (v{proposal?.baseVersion} → v{targetDoc?.version}). Coordinates may no longer align with target bases. Reject and re-run.</p>
            </div>
          )}

          <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Operation</span>
              <span className="font-medium text-[13px] text-[var(--text)] flex items-center gap-1.5">
                {getActionIcon()} {getActionTitle()}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
              <span className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Target Document</span>
              <span className="font-mono text-[12px] text-[var(--text)] font-semibold">
                {targetDoc?.name || proposal.documentId} ({targetDoc?.topology || 'linear'})
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
              <span className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Length Impact</span>
              <span className="font-mono text-[12px]">
                <span className="text-[var(--text-muted)]">{payload.originalLength} bp</span>
                <span className="mx-1 text-[var(--text-muted)]">→</span>
                <span className={`font-semibold ${payload.newLength > payload.originalLength ? 'text-[var(--success)]' : payload.newLength < payload.originalLength ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}>
                  {payload.newLength} bp
                </span>
                {payload.newLength !== payload.originalLength && (
                  <span className="ml-1 text-[11px] text-[var(--text-muted)]">
                    ({payload.newLength > payload.originalLength ? `+${payload.newLength - payload.originalLength}` : `${payload.newLength - payload.originalLength}`} bp)
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="bg-[var(--panel-muted)] border border-[var(--border)] rounded-md p-3">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">
              Summary of Modification
            </div>
            <p className="text-[13px] text-[var(--text)] leading-relaxed font-sans">
              {payload.summary}
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--border)] px-5 py-3 bg-[var(--panel-muted)] flex items-center justify-end gap-2.5">
          <button
            onClick={() => decide(false)}
            className="px-3.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--border)] text-[var(--text)] font-medium transition-colors cursor-pointer"
          >
            Reject
          </button>
          <button
            onClick={() => decide(true)}
            disabled={isStale}
            className={`px-4 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors shadow-xs ${isStale ? 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed opacity-50' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] cursor-pointer'}`}
          >
            <Check size={14} /> Approve & Apply Mutation
          </button>
        </div>
      </div>
    </div>
  );
}
