import type { Feature } from '../../domain/feature';
import { getFeatureLength } from '../../domain/feature';
import type { SequenceDocument } from '../../domain/document';
import { useState } from 'react';
import { FeatureDialog } from '../features/FeatureDialog';
import { getFeatureColor } from '../../domain/feature-colors';
import { Button } from '../ui/button';
import { Pencil } from 'lucide-react';

export function FeatureInspector({ document, feature }: { document: SequenceDocument; feature: Feature }) {
  const [editing, setEditing] = useState(false);
  const formatNum = new Intl.NumberFormat('en-US');
  const minStart = Math.min(...feature.segments.map(s => s.start0));
  const maxEnd = Math.max(...feature.segments.map(s => s.end0Exclusive));
  const length = getFeatureLength(feature);

  const isOriginSpanning = document.topology === 'circular' &&
    feature.segments.length === 2 &&
    feature.segments.some(s => s.end0Exclusive === document.length) &&
    feature.segments.some(s => s.start0 === 0);

  const rangeDisplay = isOriginSpanning
    ? (() => {
        const seg1 = feature.segments.find(s => s.end0Exclusive === document.length)!;
        const seg2 = feature.segments.find(s => s.start0 === 0)!;
        return `${formatNum.format(seg1.start0 + 1)}–${formatNum.format(document.length)} ^ 1–${formatNum.format(seg2.end0Exclusive)}`;
      })()
    : `${formatNum.format(minStart + 1)}–${formatNum.format(maxEnd)}`;

  const colorVar = getFeatureColor(feature.type);

  const qualifiers = Object.entries(feature.qualifiers || {});

  return (
    <div className="flex flex-col text-[12px] font-ui space-y-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[14px] font-semibold text-[var(--text)] flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorVar }} />
          {feature.name}
        </h2>
        <div className="text-[11px] text-[var(--text-muted)] capitalize">{feature.type}</div>
      </div>
      
      <div className="grid grid-cols-[80px_1fr] gap-y-2">
        <div className="text-[var(--text-muted)]">Range</div>
        <div className="text-[var(--text)] font-medium">{rangeDisplay}</div>
        
        <div className="text-[var(--text-muted)]">Length</div>
        <div className="text-[var(--text)]">{formatNum.format(length)} bp</div>
        
        <div className="text-[var(--text-muted)]">Strand</div>
        <div className="text-[var(--text)]">{feature.strand === 1 ? 'Forward' : 'Reverse'}</div>
        
        <div className="text-[var(--text-muted)]">Source</div>
        <div className="text-[var(--text)] capitalize">{feature.source}</div>
      </div>

      {feature.segments.length > 1 && (
        <div className="border-t border-[var(--border)] pt-3.5">
          <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1">Segments</div>
          {feature.segments.map((seg, i) => (
            <div key={i} className="text-[var(--text)] font-mono text-[11px]">
              {formatNum.format(seg.start0 + 1)}–{formatNum.format(seg.end0Exclusive)}
            </div>
          ))}
        </div>
      )}

      {qualifiers.length > 0 && (
        <div className="border-t border-[var(--border)] pt-3.5 space-y-2.5">
          <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1">Details</div>
          {qualifiers.map(([key, val]) => (
            <div key={key}>
              <div className="text-[11px] font-medium text-[var(--text-muted)] capitalize mb-0.5">{key}</div>
              <div className="text-[var(--text)] leading-relaxed">
                {Array.isArray(val) ? val.join(', ') : val}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-[var(--border)] pt-3.5">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setEditing(true)} 
          className="w-full justify-start gap-2 text-[12px] h-[30px]"
        >
          <Pencil size={13} className="text-[var(--accent)]" />
          Edit annotation
        </Button>
      </div>
      {editing && <FeatureDialog document={document} feature={feature} open onOpenChange={setEditing} />}
    </div>
  );
}
