import { assignRestrictionLanesLine } from "./RestrictionTrack";
import { deduplicateFeaturesForDisplay } from "./feature-layout";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SequenceDocument } from '../../domain/document';
import { SequenceLine } from './SequenceLine';
import { BASES_PER_LINE, positionXToLineIndex } from './sequence-geometry';
import { splitSelectionIntoSegments } from '../map/plasmid-geometry';
import { useWorkspaceStore } from '../../state/workspace-store';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';

interface SequenceViewerProps {
  document: SequenceDocument;
}

export function SequenceViewer({ document }: SequenceViewerProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const measureCharRef = useRef<HTMLSpanElement>(null);
  const [charWidthPx, setCharWidthPx] = useState(8.4); // fallback approx
  
  const setSelection = useWorkspaceStore(s => s.setSelection);
  const selectFeature = useWorkspaceStore(s => s.selectFeature);
  const selectDocumentFeature = useWorkspaceStore(s => s.selectDocumentFeature);
  const selectedFeatureId = useWorkspaceStore(s => s.selectedFeatureId);
  const selection = useWorkspaceStore(s => s.selection);
  
  const selectedRestrictionSiteId = useWorkspaceStore(s => s.selectedRestrictionSiteId);
  const selectRestrictionSite = useWorkspaceStore(s => s.selectRestrictionSite);

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartBase, setDragStartBase] = useState<number | null>(null);

  useEffect(() => {
    if (measureCharRef.current) {
      setCharWidthPx(measureCharRef.current.getBoundingClientRect().width / 10);
    }
  }, []);

  const seqLength = document.sequence.length;
  const rawSeq = document.sequence.raw;
  const rowCount = Math.ceil(seqLength / BASES_PER_LINE);

  const restrictionSites = useMemo(() => {
    return analyzeRestrictionSites(document.sequence.raw, document.topology, BUILTIN_ENZYMES);
  }, [document.sequence.raw, document.topology]);
  
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  const getBaseFromEvent = useCallback((e: ReactMouseEvent, lineStartIndex: number) => {
    // We need the x position relative to the sequence text container.
    // The event target might be a child span, so we use currentTarget
    const rect = e.currentTarget.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const lineIndex = positionXToLineIndex(xPx, charWidthPx);
    return Math.min(lineStartIndex + lineIndex, seqLength);
  }, [charWidthPx, seqLength]);

  const handleLineMouseDown = useCallback((e: ReactMouseEvent, lineStartIndex: number) => {
    e.preventDefault(); // prevent text selection
    const base = getBaseFromEvent(e, lineStartIndex);
    setIsDragging(true);
    selectFeature(null);
    setDragStartBase(base);
    setSelection(document.id, base, base + 1);
  }, [document.id, getBaseFromEvent, setSelection]);

  const handleFeatureClick = useCallback((feature: import('../../domain/feature').Feature, e: ReactMouseEvent) => {
    e.stopPropagation();
    selectDocumentFeature(document.id, feature.id);
  }, [selectDocumentFeature, document.id]);

  const handleRestrictionSiteClick = useCallback((site: import('../../scientific/restriction-analysis').RestrictionSite, e: ReactMouseEvent) => {
    e.stopPropagation();
    selectRestrictionSite(site.id);
  }, [selectRestrictionSite]);

  const handleLineMouseMove = useCallback((e: ReactMouseEvent, lineStartIndex: number) => {
    if (!isDragging || dragStartBase === null) return;
    const currentBase = getBaseFromEvent(e, lineStartIndex);
    
    const start0 = Math.min(dragStartBase, currentBase);
    const end0 = Math.max(dragStartBase, currentBase) + 1; // +1 because currentBase is the char we are hovering
    
    setSelection(document.id, start0, end0);
  }, [isDragging, dragStartBase, document.id, getBaseFromEvent, setSelection]);

  const handleGlobalMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStartBase(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging, handleGlobalMouseUp]);

  return (
    <div 
      ref={parentRef} 
      className="h-full w-full overflow-auto bg-[var(--bg)] font-mono text-[14px]"
      style={{ WebkitFontSmoothing: 'antialiased' }}
    >
      {/* Invisible measurement element */}
      <span ref={measureCharRef} className="absolute opacity-0 pointer-events-none">MMMMMMMMMM</span>
      
      <div
        className="relative w-full"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * BASES_PER_LINE;
          const endIndex = Math.min(startIndex + BASES_PER_LINE, seqLength);
          const seqChunk = rawSeq.slice(startIndex, endIndex);

          const allRowFeatures = document.features.filter(f => f.type !== "source" &&
            f.segments.some(seg => seg.start0 < endIndex && seg.end0Exclusive > startIndex)
          );
          const rowFeatures = deduplicateFeaturesForDisplay(allRowFeatures);

          // Find restriction sites that cut on this line
          const sitesOnLine = restrictionSites.filter(s => s.forwardCut0 >= startIndex && s.forwardCut0 < endIndex);
          const placedSites = assignRestrictionLanesLine(sitesOnLine, startIndex);

          // Calculate selection bounds for this line
          let lineSelection = null;
          if (selection && selection.documentId === document.id) {
            const selSegments = splitSelectionIntoSegments(selection.start0, selection.end0Exclusive, seqLength);
            for (const seg of selSegments) {
              const selStart = Math.max(startIndex, seg.start0);
              const selEnd = Math.min(endIndex, seg.end0Exclusive);
              if (selStart < selEnd) {
                lineSelection = {
                  startIdx: selStart - startIndex,
                  endIdxExclusive: selEnd - startIndex
                };
                break;
              }
            }
          }

          return (
            <SequenceLine
              key={virtualRow.index}
              startIndex={startIndex}
              seqChunk={seqChunk}
              seqLength={seqLength}
              features={rowFeatures}
              measureRef={rowVirtualizer.measureElement}
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
              data-index={virtualRow.index}
              selectedFeatureId={selectedFeatureId}
              selectedRestrictionSiteId={selectedRestrictionSiteId}
              restrictionSites={placedSites}
              selection={lineSelection}
              onTextMouseDown={(e) => handleLineMouseDown(e, startIndex)}
              onTextMouseMove={(e) => handleLineMouseMove(e, startIndex)}
              onFeatureClick={handleFeatureClick}
              onRestrictionSiteClick={handleRestrictionSiteClick}
              
            />
          );
        })}
      </div>
    </div>
  );
}
