import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../state/workspace-store';
import { useActivityStore, type ActivityEvent } from '../../state/activity-store';
import { useWebMCPToolCount } from '../../webmcp/use-webmcp-status';
import { computeSequenceSha256, formatShortHash } from '../../utils/sequence-hash';

export function AgentRunPanel() {
  const activeDocumentId = useWorkspaceStore(s => s.activeDocumentId);
  const documents = useWorkspaceStore(s => s.documents);
  const activeDoc = documents.find(d => d.id === activeDocumentId);

  const events = useActivityStore(s => s.events);
  const pendingTransaction = useActivityStore(s => s.pendingTransaction);
  const commitPendingTransaction = useActivityStore(s => s.commitPendingTransaction);
  const rejectPendingTransaction = useActivityStore(s => s.rejectPendingTransaction);

  const toolCount = useWebMCPToolCount();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const targetDoc = pendingTransaction ? documents.find(d => d.id === pendingTransaction.documentId) : null;
  const [targetDocHash, setTargetDocHash] = useState<string>('');
  const [activeDocHash, setActiveDocHash] = useState<string>('');
  const [commitError, setCommitError] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    if (targetDoc?.sequence) {
      computeSequenceSha256(targetDoc.sequence.raw).then(setTargetDocHash);
    } else {
      setTargetDocHash('');
    }
  }, [targetDoc?.sequence, targetDoc?.version, targetDoc?.id]);

  useEffect(() => {
    if (activeDoc?.sequence) {
      computeSequenceSha256(activeDoc.sequence.raw).then(setActiveDocHash);
    } else {
      setActiveDocHash('');
    }
  }, [activeDoc?.sequence, activeDoc?.version, activeDoc?.id]);

  // If there is a pending transaction, default selection to it
  useEffect(() => {
    if (pendingTransaction) {
      const matchingEvent = events.find(e => e.transaction?.id === pendingTransaction.id || e.callId === pendingTransaction.id);
      if (matchingEvent) {
        setSelectedEventId(matchingEvent.id);
      }
    } else if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [pendingTransaction, events]);

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0] || null;

  // Check if pending transaction is stale against its own target document
  const isStale = Boolean(
    pendingTransaction && (
      !targetDoc ||
      pendingTransaction.status === 'stale' ||
      targetDoc.version !== pendingTransaction.baseRevision ||
      (targetDocHash && pendingTransaction.baseSequenceHash !== targetDocHash)
    )
  );

  const handleApply = async () => {
    setCommitError(null);
    setIsCommitting(true);
    try {
      const result = await commitPendingTransaction();
      if (!result.success) {
        setCommitError(result.error || 'Commit rejected');
      }
    } catch (err: any) {
      setCommitError(err.message || 'Commit failed');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReject = () => {
    setCommitError(null);
    rejectPendingTransaction();
  };

  const getStatusIcon = (status: ActivityEvent['status']) => {
    switch (status) {
      case 'success':
        return <span className="text-[var(--success)] font-bold">✓</span>;
      case 'error':
        return <span className="text-[var(--danger)] font-bold">✕</span>;
      case 'awaiting_approval':
        return <span className="text-amber-500 font-bold">◉</span>;
      case 'rejected':
        return <span className="text-[var(--text-muted)] font-bold">✕</span>;
    }
  };

  const cleanToolName = (name: string) => {
    return name.replace(/^seqcraft_/, '').replace(/_/g, ' ');
  };

  return (
    <div className="h-full flex flex-col bg-[var(--panel)] font-ui text-[12px] text-[var(--text)] select-none">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--panel-muted)] flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
            AGENT RUN
          </span>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            WebMCP · {toolCount}
          </span>
        </div>

        {activeDoc ? (
          <div>
            <div className="font-semibold text-[13px] text-[var(--text)] truncate">
              {activeDoc.name}
            </div>
            <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2">
              <span>revision {activeDoc.version}</span>
              <span>·</span>
              <span>{activeDoc.length.toLocaleString()} bp</span>
            </div>
            <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">
              sequence hash {formatShortHash(activeDocHash, 10)}…
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-[var(--text-muted)]">
            No document loaded
          </div>
        )}
      </div>

      {/* Split view: Timeline (top) and Details / Transaction (bottom) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Timeline list */}
        <div className="flex-1 min-h-[120px] max-h-[45%] overflow-y-auto border-b border-[var(--border)] divide-y divide-[var(--border)]/50">
          {events.length === 0 ? (
            <div className="p-4 text-center text-[var(--text-muted)] text-[11px]">
              No WebMCP tool calls recorded yet.
            </div>
          ) : (
            events.map((ev) => {
              const isSelected = selectedEvent?.id === ev.id;
              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEventId(ev.id)}
                  className={`px-3 py-2 flex items-start gap-2.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[var(--accent)]/10 text-[var(--text)]' : 'hover:bg-[var(--panel-muted)] text-[var(--text-muted)]'
                  }`}
                >
                  <div className="mt-0.5 w-3.5 text-center flex-none">
                    {getStatusIcon(ev.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-[12px] capitalize text-[var(--text)] truncate">
                        {cleanToolName(ev.toolName)}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] flex-none">
                        {ev.durationMs}ms
                      </span>
                    </div>
                    <div className="text-[11px] truncate text-[var(--text-muted)]">
                      {ev.resultSummary || ev.inputSummary}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Details & Transaction Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-[var(--bg)]">
          {/* Pending Transaction Approval Interface */}
          {pendingTransaction && (
            <div className="border border-amber-500/40 rounded-md bg-[var(--panel)] p-3 space-y-3 font-mono text-[11px]">
              <div className="text-[11px] font-bold text-amber-500 tracking-wider uppercase border-b border-[var(--border)] pb-1.5">
                PROPOSED SEQUENCE TRANSACTION
              </div>

              <div className="space-y-2 text-[12px]">
                {pendingTransaction.invariantReport && (
                  <>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Position</div>
                      <div className="font-semibold text-[var(--text)]">
                        {pendingTransaction.invariantReport.position1?.toLocaleString() ?? '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Change</div>
                      <div className="font-semibold text-[var(--text)]">
                        {pendingTransaction.invariantReport.originalBase} → {pendingTransaction.invariantReport.mutatedBase}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">DNA</div>
                  <div className="text-[12px] tracking-widest text-[var(--text)] font-mono">
                    {pendingTransaction.invariantReport?.cdsVerification?.codonBefore || pendingTransaction.beforeFragment}
                    <span className="text-[var(--text-muted)] mx-2">→</span>
                    {pendingTransaction.invariantReport?.cdsVerification?.codonAfter || pendingTransaction.afterFragment}
                  </div>
                </div>

                {pendingTransaction.invariantReport?.cdsVerification && (
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Protein</div>
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="text-[var(--text)]">
                        {pendingTransaction.invariantReport.cdsVerification.aminoAcidBefore || 'N/A'}
                        <span className="text-[var(--text-muted)] mx-2">→</span>
                        {pendingTransaction.invariantReport.cdsVerification.aminoAcidAfter || 'N/A'}
                      </span>
                      {pendingTransaction.invariantReport.cdsVerification.isSynonymous && (
                        <span className="text-[var(--success)] text-[11px]">✓ unchanged</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Verified Effects / Invariants */}
              {pendingTransaction.invariantReport && (
                <div className="border-t border-[var(--border)] pt-2.5 space-y-1.5">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Verified effects
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {pendingTransaction.invariantReport.cdsVerification && (
                      <div className="flex items-center gap-1.5">
                        <span className={pendingTransaction.invariantReport.cdsVerification.isSynonymous ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                          {pendingTransaction.invariantReport.cdsVerification.isSynonymous ? '✓' : '✕'}
                        </span>
                        <span>
                          {pendingTransaction.invariantReport.cdsVerification.isSynonymous ? 'translation unchanged' : 'translation altered'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--success)]">✓</span>
                      <span>
                        sequence length {pendingTransaction.invariantReport.lengthBefore} → {pendingTransaction.invariantReport.lengthAfter}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--success)]">✓</span>
                      <span>
                        {pendingTransaction.invariantReport.changedNucleotideCount} nucleotide{pendingTransaction.invariantReport.changedNucleotideCount === 1 ? '' : 's'} changed
                      </span>
                    </div>

                    {pendingTransaction.invariantReport.enzymeVerification && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--success)]">✓</span>
                        <span>
                          internal {pendingTransaction.invariantReport.enzymeVerification.enzymeName} sites {pendingTransaction.invariantReport.enzymeVerification.countBefore} → {pendingTransaction.invariantReport.enzymeVerification.countAfter}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className={pendingTransaction.invariantReport.coordinatesStable ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                        {pendingTransaction.invariantReport.coordinatesStable ? '✓' : '⚠'}
                      </span>
                      <span>
                        {pendingTransaction.invariantReport.coordinatesStable ? 'feature coordinates unchanged' : 'feature coordinates shifted'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-[var(--border)] pt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>Base revision</span>
                <span className="font-bold text-[var(--text)]">{pendingTransaction.baseRevision}</span>
              </div>

              {/* Stale Warning or Commit Error */}
              {isStale && (
                <div className="p-2 border border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)] text-[11px] rounded">
                  <div className="font-semibold">Stale transaction</div>
                  <div>Sequence changed after this proposal was analysed. Re-analysis required.</div>
                </div>
              )}

              {commitError && !isStale && (
                <div className="p-2 border border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)] text-[11px] rounded">
                  {commitError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--panel-muted)] hover:bg-[var(--panel)] text-[var(--text)] transition-colors cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={isStale || isCommitting}
                  onClick={handleApply}
                  className={`px-3 py-1 rounded font-semibold transition-colors ${
                    isStale || isCommitting
                      ? 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                      : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] cursor-pointer'
                  }`}
                >
                  {isCommitting ? 'Applying…' : 'Apply mutation'}
                </button>
              </div>
            </div>
          )}

          {/* Selected normal event details */}
          {selectedEvent && (
            <div className="space-y-2.5 text-[11px] font-mono">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] pb-1">
                Event Provenance
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[var(--text-muted)]">Tool:</span>
                  <div className="text-[var(--text)] font-semibold truncate">{selectedEvent.toolName}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Category:</span>
                  <div className="text-[var(--text)] capitalize">{selectedEvent.category}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Duration:</span>
                  <div className="text-[var(--text)]">{selectedEvent.durationMs} ms</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Status:</span>
                  <div className="text-[var(--text)] capitalize">{selectedEvent.status}</div>
                </div>
              </div>

              {selectedEvent.documentRevisionBefore !== undefined && (
                <div className="border-t border-[var(--border)] pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Revision:</span>
                    <span className="text-[var(--text)]">
                      v{selectedEvent.documentRevisionBefore}
                      {selectedEvent.documentRevisionAfter !== undefined && ` → v${selectedEvent.documentRevisionAfter}`}
                    </span>
                  </div>
                  {selectedEvent.sequenceHashBefore && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Hash before:</span>
                      <span className="text-[var(--text)]">{formatShortHash(selectedEvent.sequenceHashBefore, 12)}</span>
                    </div>
                  )}
                  {selectedEvent.sequenceHashAfter && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Hash after:</span>
                      <span className="text-[var(--text)]">{formatShortHash(selectedEvent.sequenceHashAfter, 12)}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedEvent.arguments && Object.keys(selectedEvent.arguments).length > 0 && (
                <div className="border-t border-[var(--border)] pt-2">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Parameters</div>
                  <pre className="p-1.5 rounded bg-[var(--panel-muted)] text-[10px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedEvent.arguments, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEvent.structuredResult != null && (
                <div className="border-t border-[var(--border)] pt-2">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Result</div>
                  <pre className="p-1.5 rounded bg-[var(--panel-muted)] text-[10px] overflow-x-auto whitespace-pre-wrap max-h-40">
                    {JSON.stringify(selectedEvent.structuredResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
