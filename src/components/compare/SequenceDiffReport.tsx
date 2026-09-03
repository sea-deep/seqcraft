import { useState } from 'react';
import { ArrowRight, BadgeCheck, Check, ChevronDown, ChevronUp, CircleAlert, CircleDot, Code2, Dna, GitCommitHorizontal, RotateCcw, Tags } from 'lucide-react';
import type { BaseDifference, FeatureDifference, ProteinConsequence, SequenceDiffResult } from '../../domain/sequence-diff';

const AA3: Record<string, string> = { A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys', E: 'Glu', Q: 'Gln', G: 'Gly', H: 'His', I: 'Ile', L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro', S: 'Ser', T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val', '*': 'Stop', X: 'Xaa' };

interface ComparisonVerdict {
  tone: 'success' | 'info' | 'warning';
  title: string;
  description: string;
}

function getComparisonVerdict(result: SequenceDiffResult): ComparisonVerdict {
  const changedFeatures = result.featureDifferences.filter(difference => difference.kind !== 'unchanged').length;
  const lengthDelta = Math.abs(result.query.length - result.reference.length);
  const lengthRatio = lengthDelta / Math.max(result.reference.length, result.query.length, 1);
  if (result.differences.length === 0 && changedFeatures === 0) {
    return { tone: 'success', title: 'Same biological molecule', description: 'No base or annotation changes remain after normalizing circular origin and strand orientation.' };
  }
  if (result.identityPercent >= 99 && lengthRatio <= 0.02) {
    return { tone: 'info', title: 'Same molecule with small edits', description: 'These look like nearby versions. Review the short change list before accepting the newer sequence.' };
  }
  if (result.identityPercent >= 90 && lengthRatio <= 0.15) {
    return { tone: 'info', title: 'Likely related versions', description: 'The sequences are mostly alike, but contain meaningful sequence or annotation changes.' };
  }
  return { tone: 'warning', title: 'These may not be versions of the same molecule', description: `Identity is ${result.identityPercent.toFixed(1)}% and the lengths differ by ${lengthDelta.toLocaleString()} bp. Confirm that you selected the intended documents before reviewing individual edits.` };
}

function sequenceHeadline(difference: BaseDifference): string {
  const position1 = difference.referenceStart0 + 1;
  if (difference.kind === 'insertion') return `${difference.queryBases.length} bp inserted at ${position1.toLocaleString()}`;
  if (difference.kind === 'deletion') return `${difference.referenceBases.length} bp deleted at ${position1.toLocaleString()}`;
  if (difference.referenceBases.length === 1) return `${difference.referenceBases} → ${difference.queryBases} at ${position1.toLocaleString()}`;
  return `${difference.referenceBases.length} bp substituted at ${position1.toLocaleString()}`;
}

function featureHeadline(difference: FeatureDifference): string {
  const name = difference.referenceFeature?.name ?? difference.queryFeature?.name ?? 'Annotation';
  if (difference.kind === 'unchanged') return `${name} unchanged`;
  if (difference.kind === 'added') return `${name} added`;
  if (difference.kind === 'removed') return `${name} removed`;
  const { shiftBp, lengthDeltaBp } = difference.coordinateDelta;
  if (difference.changes.length === 1 && difference.changes[0] === 'coordinates' && shiftBp) return `${name} shifted ${shiftBp > 0 ? '+' : '−'}${Math.abs(shiftBp).toLocaleString()} bp`;
  if (lengthDeltaBp) return `${name} modified · ${lengthDeltaBp > 0 ? '+' : '−'}${Math.abs(lengthDeltaBp)} bp`;
  return `${name} modified`;
}

function consequenceHeadline(consequence: ProteinConsequence): string {
  if (consequence.firstAffectedAminoAcid1 && consequence.referenceAminoAcids.length === 1 && consequence.queryAminoAcids.length === 1) {
    return `${consequence.featureName} · ${AA3[consequence.referenceAminoAcids] ?? consequence.referenceAminoAcids}${consequence.firstAffectedAminoAcid1} → ${AA3[consequence.queryAminoAcids] ?? consequence.queryAminoAcids}${consequence.firstAffectedAminoAcid1}`;
  }
  return `${consequence.featureName} · ${consequence.kinds.map(kind => kind.replaceAll('_', ' ')).join(', ')}`;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
      <div className="text-[12px] font-medium text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-[18px] font-semibold tracking-tight text-[var(--text)]">{value}</div>
      {detail && <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{detail}</div>}
    </div>
  );
}

function ChangeStat({ label, operations, bases, color }: { label: string; operations: number; bases: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div>
        <div className="text-[12px] font-medium text-[var(--text)]">{label}</div>
        <div className="text-[11px] font-mono text-[var(--text-secondary)]">{operations} event{operations === 1 ? '' : 's'} · {bases.toLocaleString()} bp</div>
      </div>
    </div>
  );
}

export function SequenceDiffReport({ result, onSelectDifference }: { result: SequenceDiffResult; onSelectDifference: (differenceId: string) => void }) {
  const [showEdits, setShowEdits] = useState(false);
  const changedFeatures = result.featureDifferences.filter(difference => difference.kind !== 'unchanged');
  const unchangedFeatures = result.featureDifferences.filter(difference => difference.kind === 'unchanged');
  const verdict = getComparisonVerdict(result);
  const representation = result.representation;
  const substitutions = result.differences.filter(difference => difference.kind === 'substitution');
  const insertions = result.differences.filter(difference => difference.kind === 'insertion');
  const deletions = result.differences.filter(difference => difference.kind === 'deletion');
  const sumBases = (differences: BaseDifference[], side: 'reference' | 'query') => differences.reduce((sum, difference) => sum + (side === 'reference' ? difference.referenceBases.length : difference.queryBases.length), 0);
  const lengthDelta = result.query.length - result.reference.length;
  const verdictStyle = verdict.tone === 'success'
    ? 'border-[var(--success)]/30 bg-[var(--success)]/8'
    : verdict.tone === 'warning' ? 'border-[var(--warning)]/35 bg-[var(--warning)]/8' : 'border-[var(--info)]/30 bg-[var(--info)]/8';
  const VerdictIcon = verdict.tone === 'success' ? BadgeCheck : verdict.tone === 'warning' ? CircleAlert : Dna;

  return <div className="h-full overflow-auto bg-[var(--bg-editor)] p-4 text-[12px] sm:p-6">
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <div className="text-[12px] font-medium text-[var(--text-muted)]">Comparison summary</div>
        <h2 className="mt-1 flex flex-wrap items-center gap-2 text-[18px] font-semibold tracking-tight text-[var(--text)]">
          <span>{result.reference.name}</span>
          <ArrowRight size={16} className="text-[var(--text-muted)]" />
          <span>{result.query.name}</span>
        </h2>
      </header>

      <section className={`flex items-start gap-3 rounded-xl border p-4 ${verdictStyle}`}>
        <VerdictIcon size={20} className={`mt-0.5 shrink-0 ${verdict.tone === 'success' ? 'text-[var(--success)]' : verdict.tone === 'warning' ? 'text-[var(--warning)]' : 'text-[var(--info)]'}`} />
        <div>
          <h3 className={`text-[14px] font-semibold ${verdict.tone === 'success' ? 'text-[var(--success)]' : verdict.tone === 'warning' ? 'text-[var(--warning)]' : 'text-[var(--info)]'}`}>{verdict.title}</h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-[var(--text-secondary)]">{verdict.description}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Sequence identity" value={`${result.identityPercent.toFixed(1)}%`} detail={result.exact ? 'Exact bounded alignment' : 'Approximate bounded alignment'} />
        <Metric label="Reference length" value={`${result.reference.length.toLocaleString()} bp`} detail={result.reference.topology} />
        <Metric label="Compared length" value={`${result.query.length.toLocaleString()} bp`} detail={result.query.topology} />
        <Metric label="Length change" value={`${lengthDelta > 0 ? '+' : lengthDelta < 0 ? '−' : ''}${Math.abs(lengthDelta).toLocaleString()} bp`} detail={lengthDelta === 0 ? 'Same length' : lengthDelta > 0 ? 'Compared sequence is longer' : 'Compared sequence is shorter'} />
      </div>

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3">
          <GitCommitHorizontal size={15} className="text-[var(--accent)]" />
          <h3 className="text-[13px] font-semibold text-[var(--text)]">Sequence changes</h3>
          <span className="ml-auto font-mono text-[11px] text-[var(--text-muted)]">{result.differences.length} total events</span>
        </div>
        {result.differences.length === 0 ? <div className="flex items-center gap-2 p-4 text-[var(--success)]"><Check size={14} />No base changes after normalization.</div> : <>
          <div className="grid gap-2 p-4 sm:grid-cols-3">
            <ChangeStat label="Substitutions" operations={substitutions.length} bases={sumBases(substitutions, 'reference')} color="var(--warning)" />
            <ChangeStat label="Insertions" operations={insertions.length} bases={sumBases(insertions, 'query')} color="var(--success)" />
            <ChangeStat label="Deletions" operations={deletions.length} bases={sumBases(deletions, 'reference')} color="var(--danger)" />
          </div>
          <button aria-expanded={showEdits} onClick={() => setShowEdits(value => !value)} className="flex w-full items-center justify-between border-t border-[var(--border)] px-4 py-3 text-left hover:bg-[var(--panel-muted)] transition-colors cursor-pointer">
            <span>
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">Review individual edits</span>
              <span className="ml-2 text-[11px] text-[var(--text-muted)]">opens exact coordinates</span>
            </span>
            {showEdits ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
          </button>
          {showEdits && <div className="max-h-[360px] overflow-auto border-t border-[var(--border)]"><div className="grid sm:grid-cols-2">{result.differences.map(difference => <button key={difference.id} onClick={() => onSelectDifference(difference.id)} className="flex items-start gap-2 border-b border-r border-[var(--border)] px-4 py-3 text-left hover:bg-[var(--panel-muted)] cursor-pointer"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${difference.kind === 'substitution' ? 'bg-[var(--warning)]' : difference.kind === 'insertion' ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} /><span className="min-w-0"><span className="font-medium text-[var(--text)]">{sequenceHeadline(difference)}</span><span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--text-muted)]">{difference.referenceBases || '∅'} → {difference.queryBases || '∅'}</span></span></button>)}</div></div>}
        </>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3">
            <Tags size={15} className="text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--text)]">Annotations</h3>
            <span className="ml-auto font-mono text-[11px] text-[var(--text-muted)]">{changedFeatures.length} changed · {unchangedFeatures.length} unchanged</span>
          </div>
          {changedFeatures.length === 0 && unchangedFeatures.length === 0 ? (
            <div className="p-4 text-[var(--text-muted)]">No annotations in either document.</div>
          ) : (
            <div>
              {changedFeatures.map(difference => (
                <div key={difference.id} className="border-b border-[var(--border)] px-4 py-3">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-[var(--text)]">{featureHeadline(difference)}</span>
                    <span className="capitalize text-[11px] text-[var(--text-muted)]">{difference.kind}</span>
                  </div>
                  {difference.changes.length > 0 && <div className="mt-1 text-[11px] text-[var(--text-muted)]">{difference.changes.join(' · ')}</div>}
                </div>
              ))}
              {unchangedFeatures.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-4">
                  {unchangedFeatures.slice(0, 12).map(difference => (
                    <span key={difference.id} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
                      <Check size={9} className="mr-1 inline text-[var(--success)]" />{difference.referenceFeature?.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3">
            <Code2 size={15} className="text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--text)]">Coding impact</h3>
            <span className="ml-auto font-mono text-[11px] text-[var(--text-muted)]">{result.proteinConsequences.length} affected CDS</span>
          </div>
          {result.proteinConsequences.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-[var(--success)]">
              <Check size={14} />No affected coding regions.
            </div>
          ) : (
            result.proteinConsequences.map(consequence => (
              <div key={consequence.id} className="border-b border-[var(--border)] px-4 py-3 last:border-0">
                <div className="font-medium text-[var(--text)]">{consequenceHeadline(consequence)}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {consequence.kinds.map(kind => (
                    <span key={kind} className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[11px] text-[var(--accent)]">{kind.replaceAll('_', ' ')}</span>
                  ))}
                </div>
                {consequence.firstAffectedAminoAcid1 && (
                  <div className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
                    AA {consequence.firstAffectedAminoAcid1}: {consequence.referenceAminoAcids || '∅'} → {consequence.queryAminoAcids || '∅'}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <CircleDot size={14} className="text-[var(--accent)]" />
          <span className="text-[13px] font-semibold text-[var(--text)]">Representation</span>
          <span className="text-[var(--text-secondary)]">Topology {representation.topologyChanged ? `${representation.referenceTopology} → ${representation.queryTopology}` : `${representation.referenceTopology}, unchanged`} · origin {representation.originChanged ? 'changed' : 'unchanged'} · strand {representation.orientationChanged ? 'normalized from opposite orientation' : 'unchanged'}</span>
        </div>
        {(representation.originChanged || representation.orientationChanged) && representation.moleculeIdentityUnchanged && (
          <div className="mt-2 flex items-start gap-2 text-[var(--text-secondary)]">
            <RotateCcw size={13} className="mt-0.5 shrink-0 text-[var(--accent)]" />Origin and strand differences are representation-only and were not counted as biological edits.
          </div>
        )}
      </section>
      <p className="px-1 pb-2 text-[11px] text-[var(--text-muted)]">Restriction-site changes are derived details. JSON uses canonical 0-based half-open coordinates; displayed positions are 1-based.</p>
    </div>
  </div>;
}
