import type { RestrictionSite } from '../../scientific/restriction-analysis';
import { getEndType } from '../../scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';

interface RestrictionInspectorProps {
  site: RestrictionSite;
}

export function RestrictionInspector({ site }: RestrictionInspectorProps) {
  const enzyme = BUILTIN_ENZYMES.find(e => e.id === site.enzymeId);
  const endType = enzyme ? getEndType(enzyme) : 'unknown';

  return (
    <div className="flex flex-col text-[12px] font-ui space-y-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[14px] font-semibold text-[var(--text)]">{site.enzymeName}</h2>
        <div className="text-[11px] text-[var(--text-muted)]">Restriction site</div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-y-2">
          <div className="text-[var(--text-muted)]">Recognition</div>
          <div className="font-mono text-[11px]">{site.recognitionSequence}</div>

          <div className="text-[var(--text-muted)]">Site</div>
          <div className="font-mono text-[11px]">
            {site.start0 + 1} &ndash; {site.end0Exclusive}
          </div>

          <div className="text-[var(--text-muted)]">Fwd cut</div>
          <div className="font-mono text-[11px]">{site.forwardCut0}</div>

          <div className="text-[var(--text-muted)]">Rev cut</div>
          <div className="font-mono text-[11px]">{site.reverseCut0}</div>

          <div className="text-[var(--text-muted)]">End type</div>
          <div>{endType}</div>

          <div className="text-[var(--text-muted)]">Strand</div>
          <div>{site.strand === 1 ? 'Forward' : 'Reverse'}</div>
        </div>
      </div>
    </div>
  );
}
