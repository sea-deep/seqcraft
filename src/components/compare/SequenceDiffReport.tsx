import { ArrowRight, Check, CircleDot, Code2, GitCommitHorizontal, RotateCcw, Tags } from 'lucide-react';
import type { BaseDifference, FeatureDifference, ProteinConsequence, SequenceDiffResult } from '../../domain/sequence-diff';

const AA3: Record<string, string> = { A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys', E: 'Glu', Q: 'Gln', G: 'Gly', H: 'His', I: 'Ile', L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro', S: 'Ser', T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val', '*': 'Stop', X: 'Xaa' };

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

function Section({ icon, title, count, children }: { icon: React.ReactNode; title: string; count?: number; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]"><header className="flex h-10 items-center gap-2 border-b border-[var(--border)] bg-[var(--panel-muted)] px-3"><span className="text-[var(--accent)]">{icon}</span><h2 className="font-semibold">{title}</h2>{count !== undefined && <span className="ml-auto rounded bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">{count}</span>}</header>{children}</section>;
}

export function SequenceDiffReport({ result, onSelectDifference }: { result: SequenceDiffResult; onSelectDifference: (differenceId: string) => void }) {
  const changedFeatures = result.featureDifferences.filter(difference => difference.kind !== 'unchanged');
  const unchangedFeatures = result.featureDifferences.filter(difference => difference.kind === 'unchanged');
  const representation = result.representation;
  return <div className="h-full overflow-auto p-5 text-[12px]">
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="flex items-start justify-between gap-4 pb-1">
        <div><div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Biological change report</div><h1 className="mt-1 text-[20px] font-semibold tracking-tight">{result.reference.name} <ArrowRight size={17} className="inline text-[var(--text-muted)]" /> {result.query.name}</h1><p className="mt-1 text-[var(--text-secondary)]">Canonical sequence, annotations, coding consequences, and representation changes.</p></div>
        <div className={`rounded-full border px-3 py-1 font-medium ${result.differences.length === 0 && changedFeatures.length === 0 ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]' : 'border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]'}`}>{result.differences.length === 0 && changedFeatures.length === 0 ? 'Molecule unchanged' : `${result.differences.length + changedFeatures.length} biological changes`}</div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Section icon={<GitCommitHorizontal size={15} />} title="Sequence" count={result.differences.length}>
          {result.differences.length === 0 ? <div className="flex items-center gap-2 p-3 text-[var(--success)]"><Check size={14} />No base changes after canonicalization</div> : <div>{result.differences.map(difference => <button key={difference.id} onClick={() => onSelectDifference(difference.id)} className="flex w-full items-start gap-2 border-b border-[var(--border)] px-3 py-2.5 text-left last:border-0 hover:bg-[var(--panel-muted)]"><span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${difference.kind === 'substitution' ? 'bg-[var(--warning)]' : difference.kind === 'insertion' ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} /><span><span className="font-medium">{sequenceHeadline(difference)}</span><span className="mt-0.5 block max-w-[330px] truncate font-mono text-[10px] text-[var(--text-muted)]">{difference.referenceBases || '∅'} → {difference.queryBases || '∅'}</span></span></button>)}</div>}
        </Section>

        <Section icon={<Tags size={15} />} title="Features" count={changedFeatures.length}>
          {changedFeatures.length === 0 && unchangedFeatures.length === 0 && <div className="p-3 text-[var(--text-muted)]">No annotations in either document.</div>}
          {changedFeatures.map(difference => <div key={difference.id} className="border-b border-[var(--border)] px-3 py-2.5"><div className="flex justify-between gap-3"><span className="font-medium">{featureHeadline(difference)}</span><span className="capitalize text-[10px] text-[var(--text-muted)]">{difference.kind}</span></div>{difference.changes.length > 0 && <div className="mt-1 text-[10px] text-[var(--text-muted)]">{difference.changes.join(' · ')}</div>}</div>)}
          {unchangedFeatures.length > 0 && <div className="px-3 py-2.5"><div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Unchanged</div><div className="flex flex-wrap gap-1.5">{unchangedFeatures.map(difference => <span key={difference.id} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[11px]"><Check size={10} className="mr-1 inline text-[var(--success)]" />{difference.referenceFeature?.name}</span>)}</div></div>}
        </Section>

        <Section icon={<Code2 size={15} />} title="CDS / protein" count={result.proteinConsequences.length}>
          {result.proteinConsequences.length === 0 ? <div className="flex items-center gap-2 p-3 text-[var(--text-muted)]"><Check size={14} className="text-[var(--success)]" />No affected coding regions</div> : result.proteinConsequences.map(consequence => <div key={consequence.id} className="border-b border-[var(--border)] px-3 py-2.5 last:border-0"><div className="font-medium">{consequenceHeadline(consequence)}</div><div className="mt-1 flex flex-wrap gap-1">{consequence.kinds.map(kind => <span key={kind} className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">{kind.replaceAll('_', ' ')}</span>)}</div></div>)}
        </Section>

        <Section icon={<CircleDot size={15} />} title="Topology & representation">
          <dl className="divide-y divide-[var(--border)]">
            <div className="flex justify-between px-3 py-2.5"><dt className="text-[var(--text-muted)]">Topology</dt><dd className="font-medium">{representation.referenceTopology}{representation.topologyChanged ? ` → ${representation.queryTopology}` : ', unchanged'}</dd></div>
            <div className="flex justify-between px-3 py-2.5"><dt className="text-[var(--text-muted)]">File origin</dt><dd className="font-medium">{representation.originChanged ? 'changed' : 'unchanged'}</dd></div>
            <div className="flex justify-between px-3 py-2.5"><dt className="text-[var(--text-muted)]">Strand representation</dt><dd className="font-medium">{representation.orientationChanged ? 'opposite orientation normalized' : 'unchanged'}</dd></div>
            <div className="flex justify-between px-3 py-2.5"><dt className="text-[var(--text-muted)]">Molecule identity</dt><dd className={representation.moleculeIdentityUnchanged ? 'font-medium text-[var(--success)]' : 'font-medium text-[var(--warning)]'}>{representation.moleculeIdentityUnchanged ? 'unchanged' : 'changed'}</dd></div>
          </dl>
        </Section>
      </div>

      {(representation.originChanged || representation.orientationChanged) && representation.moleculeIdentityUnchanged && <div className="flex items-start gap-2 rounded-md border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-2.5 text-[var(--text-secondary)]"><RotateCcw size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" /><span>SeqCraft normalized the file origin and strand representation. These are representation-only changes, so they do not appear as biological edits.</span></div>}
      <div className="px-1 text-[10px] text-[var(--text-muted)]">Restriction-site changes are derived details and intentionally stay out of the headline diff. Canonical coordinates are 0-based half-open in JSON; positions above are 1-based.</div>
    </div>
  </div>;
}
