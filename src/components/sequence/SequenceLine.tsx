import type { PlacedRestrictionSite } from "./RestrictionTrack";
import { RestrictionTrack } from "./RestrictionTrack";
import type { RestrictionSite } from "../../scientific/restriction-analysis";
import { getLineIndexForLabel } from "./feature-layout";
import { type Feature } from '../../domain/feature';
import { GROUP_SIZE, baseX, segmentWidth } from './sequence-geometry';
import { FeatureSegment } from './FeatureSegment';
import type { MouseEvent as ReactMouseEvent } from "react";
import type { Primer, PrimerBinding } from '../../domain/primer';
import { PrimerTrack } from './PrimerTrack';
import type { PlacedPrimerBinding } from './primer-track-layout';
import { OrfTrack, type PlacedOrf } from './OrfTrack';

interface SequenceLineProps {
  startIndex: number;
  seqChunk: string;
  seqLength: number;
  features: Feature[];
  measureRef: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
  "data-index"?: number;
  selectedFeatureId: string | null;
  selectedRestrictionSiteId: string | null;
  selectedPrimerId: string | null;
  restrictionSites?: PlacedRestrictionSite[];
  primerBindings?: PlacedPrimerBinding[];
  orfs?: PlacedOrf[];
  selection: { startIdx: number; endIdxExclusive: number } | null;
  onTextMouseDown: (e: ReactMouseEvent) => void;
  onTextMouseMove: (e: ReactMouseEvent) => void;
  onFeatureClick: (feature: Feature, e: ReactMouseEvent) => void;
  onRestrictionSiteClick?: (site: RestrictionSite, e: ReactMouseEvent) => void;
  onRestrictionSiteHover?: (site: RestrictionSite | null) => void;
  onPrimerClick: (primer: Primer, binding: PrimerBinding, e: ReactMouseEvent) => void;
}

export function SequenceLine({ 
  startIndex, 
  seqChunk, 
  seqLength, 
  features, 
  measureRef, 
  style, 
  "data-index": dataIndex,
  selectedFeatureId,
  selectedRestrictionSiteId,
  selectedPrimerId,
  restrictionSites = [],
  primerBindings = [],
  orfs = [],
  selection,
  onTextMouseDown,
  onTextMouseMove,
  onFeatureClick,
  onRestrictionSiteClick,
  onRestrictionSiteHover,
  onPrimerClick,
}: SequenceLineProps) {
  const endIndexExclusive = startIndex + seqChunk.length;
  const currentLineIndex = Math.floor(startIndex / 60);

  interface PlacedSegment {
    feature: Feature;
    segment: import('../../domain/feature').SequenceInterval;
    segmentIndex: number;
    lineStart: number;
    lineEndExclusive: number;
  }

  const placedSegments: PlacedSegment[] = [];
  for (const feature of features) {
    for (let segIdx = 0; segIdx < feature.segments.length; segIdx++) {
      const seg = feature.segments[segIdx];
      if (seg.start0 < endIndexExclusive && seg.end0Exclusive > startIndex) {
        placedSegments.push({
          feature,
          segment: seg,
          segmentIndex: segIdx,
          lineStart: Math.max(0, seg.start0 - startIndex),
          lineEndExclusive: Math.min(seqChunk.length, seg.end0Exclusive - startIndex)
        });
      }
    }
  }

  const tracks: PlacedSegment[][] = [];
  for (const pseg of placedSegments) {
    let placed = false;
    for (let i = 0; i < tracks.length; i++) {
      const overlap = tracks[i].some(existing => 
        existing.lineStart < pseg.lineEndExclusive && existing.lineEndExclusive > pseg.lineStart
      );
      if (!overlap) {
        tracks[i].push(pseg);
        placed = true;
        break;
      }
    }
    if (!placed) {
      tracks.push([pseg]);
    }
  }

  const groups: string[] = [];
  for (let i = 0; i < seqChunk.length; i += GROUP_SIZE) {
    groups.push(seqChunk.slice(i, i + GROUP_SIZE));
  }

  const hasTopTracks = restrictionSites.length > 0 || tracks.length > 0 || primerBindings.length > 0;

  return (
    <div
      ref={measureRef}
      data-index={dataIndex}
      className="absolute top-0 left-0 min-w-full px-4 hover:bg-[var(--panel-muted)]/20 transition-colors"
      style={{
        ...style,
        paddingTop: '4px',
        paddingBottom: '4px',
      }}
    >
      <div className="relative">
        {/* Tracks Above Sequence */}
        {hasTopTracks && (
          <div className="pl-16 relative">
            {/* Restriction Sites */}
            <RestrictionTrack 
              sites={restrictionSites} 
              lineStart0={startIndex} 
              selectedSiteId={selectedRestrictionSiteId} 
              onSiteClick={(site, e) => onRestrictionSiteClick?.(site, e)}
              onSiteHover={(site) => onRestrictionSiteHover?.(site)}
            />

            {/* Feature Tracks */}
            {tracks.length > 0 && (
              <div className="relative" style={{ height: tracks.length * 16, marginBottom: "4px" }}>
                {tracks.map((track, trackIdx) => (
                  <div key={trackIdx}>
                    {track.map((pseg, idx) => (
                      <FeatureSegment
                        key={`${pseg.feature.id}-${pseg.segmentIndex}-${idx}`}
                        feature={pseg.feature}
                        segment={pseg.segment}
                        segmentIndex={pseg.segmentIndex}
                        sequenceLength={seqLength}
                        startIdx={pseg.lineStart}
                        endIdxExclusive={pseg.lineEndExclusive}
                        trackIndex={trackIdx}
                        lineStartIndex={startIndex}
                        isSelected={selectedFeatureId === pseg.feature.id}
                        onClick={(e) => onFeatureClick(pseg.feature, e)}
                        showLabel={getLineIndexForLabel(pseg.feature, seqLength) === currentLineIndex}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Primers */}
            <PrimerTrack 
              bindings={primerBindings} 
              lineStart0={startIndex}
              selectedPrimerId={selectedPrimerId} 
              onPrimerClick={onPrimerClick} 
            />
          </div>
        )}

        {/* Sequence Text Row: Line Number + Sequence Characters */}
        <div className="flex items-center">
          <div className="w-12 text-right text-[12px] text-[var(--text-muted)] select-none mr-4 h-[24px] flex items-center justify-end flex-none font-mono">
            {startIndex + 1}
          </div>

          <div 
            className="flex-1 tracking-normal font-mono text-[14px] text-[var(--text)] font-medium relative editor-cursor-sequence select-none h-[24px] flex items-center"
            onMouseDown={onTextMouseDown}
            onMouseMove={onTextMouseMove}
          >
            {/* Selection Highlight */}
            {selection && (
              <div 
                className="absolute top-0 h-full bg-[var(--selection-bg)] rounded-sm pointer-events-none"
                style={{
                  left: `${baseX(selection.startIdx)}ch`,
                  width: `${segmentWidth(selection.startIdx, selection.endIdxExclusive)}ch`
                }}
              />
            )}
            
            {groups.map((group, i) => (
              <span 
                key={i} 
                className="flex-none"
                style={{
                  width: `${group.length}ch`,
                  marginRight: i < groups.length - 1 ? '1ch' : '0'
                }}
              >
                {group}
              </span>
            ))}
          </div>
        </div>

        {/* Tracks Below Sequence (ORFs) */}
        {orfs.length > 0 && (
          <div className="pl-16 relative">
            <OrfTrack orfs={orfs} lineStart0={startIndex} />
          </div>
        )}
      </div>
    </div>
  );
}
