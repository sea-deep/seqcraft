import { assignRestrictionLanesLine } from "./RestrictionTrack";
import { deduplicateFeaturesForDisplay } from "./feature-layout";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import type { SequenceDocument } from '../../domain/document';
import { SequenceLine } from './SequenceLine';
import { BASES_PER_LINE, positionXToLineIndex } from './sequence-geometry';
import { splitSelectionIntoSegments } from '../map/plasmid-geometry';
import { useWorkspaceStore } from '../../state/workspace-store';
import { analyzeRestrictionSites } from '../../scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../data/restriction-enzymes';
import { analyzePrimerBindings } from '../../scientific/primer-binding';
import type { PrimerBinding, Primer } from '../../domain/primer';
import { findORFs } from '../../scientific/orf';
import { placePrimerBindingsOnLine } from './primer-track-layout';
import type { PlacedOrf } from './OrfTrack';
import { opfsStorage } from '../../storage/opfs-backend';
import { getMemorySequence } from '../../utils/document-utils';
import { getSequenceStorageKey } from '../../utils/document-utils';
import { LatestRangeRequest, SequenceRangeCache, type SequenceRange } from './sequence-range-cache';

interface SequenceViewerProps {
  document: SequenceDocument;
}

const MAX_INLINE_ANALYSIS_BP = 100_000;

export function SequenceViewer({ document }: SequenceViewerProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const measureCharRef = useRef<HTMLSpanElement>(null);
  const [charWidthPx, setCharWidthPx] = useState<number>(10);
  
  // Selection/Feature State
  const setSelection = useWorkspaceStore(s => s.setSelection);
  const selectDocumentFeature = useWorkspaceStore(s => s.selectDocumentFeature);
  const selectFeature = useWorkspaceStore(s => s.selectFeature);
  const selectedFeatureId = useWorkspaceStore(s => s.selectedFeatureId);
  const selection = useWorkspaceStore(s => s.selection);
  const selectedPrimerId = useWorkspaceStore(s => s.selectedPrimerId);
  const selectPrimer = useWorkspaceStore(s => s.selectPrimer);
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

  const isMemory = document.storageMode === 'memory';
  const seqLength = document.length;
  const rawSeq = isMemory ? getMemorySequence(document).raw : null;
  const canAnalyzeInline = isMemory && seqLength <= MAX_INLINE_ANALYSIS_BP;
  const rowCount = Math.ceil(seqLength / BASES_PER_LINE);

  const restrictionSites = useMemo(() => {
    return canAnalyzeInline ? analyzeRestrictionSites(rawSeq!, document.topology, BUILTIN_ENZYMES) : [];
  }, [canAnalyzeInline, rawSeq, document.topology]);

  const primers = useMemo(() => document.primers ?? [], [document.primers]);
  const primerBindings = useMemo(() => canAnalyzeInline ? primers.flatMap(primer => analyzePrimerBindings(rawSeq!, document.topology, primer)) : [], [canAnalyzeInline, rawSeq, document.topology, primers]);
  
  const orfs = useMemo(() => {
    return canAnalyzeInline ? findORFs(rawSeq!, document.topology, 30) : [];
  }, [canAnalyzeInline, rawSeq, document.topology]);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  useEffect(() => {
    if (selection?.documentId !== document.id) return;
    rowVirtualizer.scrollToIndex(Math.floor(selection.start0 / BASES_PER_LINE), { align: 'center' });
  }, [document.id, rowVirtualizer, selection]);

  // Data fetching for chunked docs
  const virtualItems = rowVirtualizer.getVirtualItems();
  const visibleStartRow = virtualItems[0]?.index ?? 0;
  const visibleEndRow = virtualItems[virtualItems.length - 1]?.index ?? 0;
  
  const visibleStartBase = visibleStartRow * BASES_PER_LINE;
  const visibleEndBase = Math.min((visibleEndRow + 1) * BASES_PER_LINE, seqLength);

  const [viewportRange, setViewportRange] = useState<SequenceRange | null>(null);
  const rangeCacheRef = useRef(new SequenceRangeCache());
  const latestRequestRef = useRef(new LatestRangeRequest());

  useEffect(() => {
    rangeCacheRef.current.clear();
    latestRequestRef.current.invalidate();
    setViewportRange(null);
  }, [document.id]);

  useEffect(() => {
    if (isMemory) return;
    if (visibleStartBase === visibleEndBase) return;

    // Fetch slightly more than visible to avoid flickering
    const fetchStart = Math.max(0, visibleStartBase - 1000);
    const fetchEnd = Math.min(seqLength, visibleEndBase + 1000);
    const cached = rangeCacheRef.current.find(document.id, visibleStartBase, visibleEndBase);
    if (cached) {
      setViewportRange(cached);
      return;
    }
    const generation = latestRequestRef.current.begin();
    const storageKey = getSequenceStorageKey(document);
    void rangeCacheRef.current.load(
      document.id,
      fetchStart,
      fetchEnd,
      (_documentId, start, end) => opfsStorage.readSequenceRange(storageKey, start, end),
    ).then(range => {
      if (latestRequestRef.current.isCurrent(generation) && range.documentId === document.id) setViewportRange(range);
    }).catch(error => {
      if (latestRequestRef.current.isCurrent(generation)) console.error('Failed to read sequence viewport', error);
    });
    return () => latestRequestRef.current.invalidate();
  }, [isMemory, document, visibleStartBase, visibleEndBase, seqLength]);

  // Utility functions for drag selection
  const getBaseFromEvent = useCallback((e: ReactMouseEvent, lineStartIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const lineIndex = positionXToLineIndex(xPx, charWidthPx);
    return Math.min(lineStartIndex + lineIndex, Math.max(0, seqLength - 1));
  }, [charWidthPx, seqLength]);

  const handleLineMouseDown = useCallback((e: ReactMouseEvent, lineStartIndex: number) => {
    e.preventDefault();
    const base = getBaseFromEvent(e, lineStartIndex);
    setIsDragging(true);
    selectFeature(null);
    setDragStartBase(base);
    setSelection(document.id, base, base + 1);
  }, [document.id, getBaseFromEvent, selectFeature, setSelection]);

  const handleFeatureClick = useCallback((feature: import('../../domain/feature').Feature, e: ReactMouseEvent) => {
    e.stopPropagation();
    selectDocumentFeature(document.id, feature.id);
  }, [selectDocumentFeature, document.id]);

  const handleRestrictionSiteClick = useCallback((site: import('../../scientific/restriction-analysis').RestrictionSite, e: ReactMouseEvent) => {
    e.stopPropagation();
    selectRestrictionSite(site.id);
  }, [selectRestrictionSite]);
  
  const handlePrimerClick = useCallback((primer: Primer, binding: PrimerBinding, e: ReactMouseEvent) => {
    e.stopPropagation();
    setSelection(document.id, binding.start0, binding.end0Exclusive);
    selectPrimer(primer.id);
  }, [document.id, selectPrimer, setSelection]);

  const handleLineMouseMove = useCallback((e: ReactMouseEvent, lineStartIndex: number) => {
    if (!isDragging || dragStartBase === null) return;
    const currentBase = getBaseFromEvent(e, lineStartIndex);
    
    const start0 = Math.min(dragStartBase, currentBase);
    const end0 = Math.max(dragStartBase, currentBase) + 1;
    
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
      <span ref={measureCharRef} className="absolute opacity-0 pointer-events-none">MMMMMMMMMM</span>
      
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualRow: VirtualItem) => {
          const startIndex = virtualRow.index * BASES_PER_LINE;
          const endIndex = Math.min(startIndex + BASES_PER_LINE, seqLength);
          
          let seqChunk: string;
          if (isMemory) {
            seqChunk = rawSeq!.slice(startIndex, endIndex);
          } else {
            if (viewportRange?.documentId === document.id && viewportRange.start <= startIndex && viewportRange.end >= endIndex) {
              const localStart = startIndex - viewportRange.start;
              seqChunk = viewportRange.sequence.slice(localStart, localStart + (endIndex - startIndex));
            } else {
              // Not loaded yet
              seqChunk = '·'.repeat(endIndex - startIndex);
            }
          }

          const allRowFeatures = document.features.filter(f => f.type !== "source" &&
            f.segments.some(seg => seg.start0 < endIndex && seg.end0Exclusive > startIndex)
          );
          const rowFeatures = deduplicateFeaturesForDisplay(allRowFeatures);

          const sitesOnLine = restrictionSites.filter(s => s.forwardCut0 >= startIndex && s.forwardCut0 < endIndex);
          const placedSites = assignRestrictionLanesLine(sitesOnLine, startIndex);
          const placedPrimerBindings = placePrimerBindingsOnLine(primers, primerBindings, startIndex, endIndex);

          const placedOrfs: PlacedOrf[] = [];
          for (const orf of orfs) {
            for (const seg of orf.segments) {
              if (seg.start0 < endIndex && seg.end0Exclusive > startIndex) {
                placedOrfs.push({
                  orf,
                  lineStart: Math.max(0, seg.start0 - startIndex),
                  lineEndExclusive: Math.min(seqChunk.length, seg.end0Exclusive - startIndex)
                });
              }
            }
          }

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
              style={{ transform: `translateY(${virtualRow.start}px)` }}
              data-index={virtualRow.index}
              selectedFeatureId={selectedFeatureId}
              selectedRestrictionSiteId={selectedRestrictionSiteId}
              selectedPrimerId={selectedPrimerId}
              restrictionSites={placedSites}
              primerBindings={placedPrimerBindings}
              orfs={placedOrfs}
              selection={lineSelection}
              onTextMouseDown={(e) => handleLineMouseDown(e, startIndex)}
              onTextMouseMove={(e) => handleLineMouseMove(e, startIndex)}
              onFeatureClick={handleFeatureClick}
              onRestrictionSiteClick={handleRestrictionSiteClick}
              onPrimerClick={handlePrimerClick}
            />
          );
        })}
      </div>
    </div>
  );
}
