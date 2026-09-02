import { useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { CircularDiffGeometry } from '../../geometry/circular-diff-geometry';
import { arcToSvgPath } from '../../export/circular-diff-svg';

export function CircularDiffMap2D({ geometry, onSelectDifference }: { geometry: CircularDiffGeometry; onSelectDifference?: (differenceId: string) => void }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; initialPan: { x: number; y: number } } | null>(null);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const changeZoom = (targetZoom: number) => {
    const clamped = Math.min(6.0, Math.max(0.5, Number(targetZoom.toFixed(2))));
    setZoom(clamped);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const nx = mouseX / rect.width;
    const ny = mouseY / rect.height;

    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(6.0, Math.max(0.5, zoom * factor));
    if (newZoom === zoom) return;

    const currentW = geometry.width / zoom;
    const currentH = geometry.height / zoom;
    const newW = geometry.width / newZoom;
    const newH = geometry.height / newZoom;

    setPan(prev => ({
      x: prev.x + (nx - 0.5) * (currentW - newW),
      y: prev.y + (ny - 0.5) * (currentH - newH),
    }));
    setZoom(newZoom);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.dataset?.differenceId || target.closest?.('[data-difference-id]')) return;
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialPan: { ...pan } };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer capture optional */ }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || !dragRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = (geometry.width / zoom) / rect.width;
    const dx = (e.clientX - dragRef.current.startX) * scale;
    const dy = (e.clientY - dragRef.current.startY) * scale;
    setPan({
      x: dragRef.current.initialPan.x + dx,
      y: dragRef.current.initialPan.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      setIsDragging(false);
      dragRef.current = null;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* pointer capture optional */ }
    }
  };

  const viewW = geometry.width / zoom;
  const viewH = geometry.height / zoom;
  const viewX = (geometry.width - viewW) / 2 - pan.x;
  const viewY = (geometry.height - viewH) / 2 - pan.y;

  return (
    <div className="relative h-full w-full overflow-hidden select-none bg-[var(--bg-editor)]">
      <svg
        ref={svgRef}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        className={`h-full w-full touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        role="img"
        aria-label={`Canonical circular difference map, ${geometry.differences.length} base differences`}
        data-geometry-id={geometry.id}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <path d={arcToSvgPath(geometry.backbone)} fill="none" stroke="var(--border-strong)" strokeWidth={geometry.backbone.width} />
        {geometry.featureArcs.map(feature => (
          <g key={feature.id} className="transition-opacity hover:opacity-100">
          <path
            data-feature-id={feature.featureId}
            data-molecule={feature.molecule}
            data-strand={feature.strand}
            data-diff-kind={feature.diffKind ?? undefined}
            d={arcToSvgPath(feature)}
            fill="none"
            stroke={feature.color}
            strokeWidth={feature.width}
            strokeLinecap={feature.arrow ? "butt" : "round"}
            opacity={feature.opacity}
          >
            <title>{`${feature.molecule === 'reference' ? 'Reference' : 'Query'} · ${feature.label} · ${feature.strand === 1 ? 'forward' : 'reverse'} strand${feature.diffKind ? ` · ${feature.diffKind}` : ''}`}</title>
          </path>
          {feature.arrow && <polygon points={`${feature.arrow.tip.x},${feature.arrow.tip.y} ${feature.arrow.left.x},${feature.arrow.left.y} ${feature.arrow.right.x},${feature.arrow.right.y}`} fill={feature.color} opacity={feature.opacity} pointerEvents="none" />}
          </g>
        ))}
        {geometry.differences.map(difference => {
          if (difference.kind === 'insertion') {
            const angle = Math.atan2(difference.marker.y - geometry.center.y, difference.marker.x - geometry.center.x);
            const rInner = geometry.backbone.radius - geometry.backbone.width / 2 - 2;
            const rOuter = geometry.backbone.radius + geometry.backbone.width / 2 + 2;
            const x1 = geometry.center.x + Math.cos(angle) * rInner;
            const y1 = geometry.center.y + Math.sin(angle) * rInner;
            const x2 = geometry.center.x + Math.cos(angle) * rOuter;
            const y2 = geometry.center.y + Math.sin(angle) * rOuter;
            return (
              <line
                key={difference.id}
                data-difference-id={difference.differenceId}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={difference.color}
                strokeWidth={Math.max(1.5, 2.5 / Math.sqrt(zoom))}
                strokeLinecap="round"
                className="cursor-pointer hover:stroke-white transition-colors"
                onClick={() => onSelectDifference?.(difference.differenceId)}
              >
                <title>{`Insertion · ${difference.queryBases}`}</title>
              </line>
            );
          }
          return (
            <path
              key={difference.id}
              data-difference-id={difference.differenceId}
              d={arcToSvgPath(difference)}
              fill="none"
              stroke={difference.color}
              strokeWidth={difference.width}
              strokeLinecap="butt"
              className="cursor-pointer hover:stroke-[var(--accent)] transition-colors"
              onClick={() => onSelectDifference?.(difference.differenceId)}
            >
              <title>{`${difference.kind} · ${difference.referenceBases || '∅'} → ${difference.queryBases || '∅'}`}</title>
            </path>
          );
        })}
        <line
          x1={geometry.origin.inner.x}
          y1={geometry.origin.inner.y}
          x2={geometry.origin.outer.x}
          y2={geometry.origin.outer.y}
          stroke="var(--accent)"
          strokeWidth={Math.max(1.5, 2.5 / Math.sqrt(zoom))}
        />
        <text
          x={geometry.origin.outer.x}
          y={geometry.origin.outer.y - 7 / zoom}
          textAnchor="middle"
          fontSize={Math.max(7, Math.round(10 / Math.sqrt(zoom)))}
          fill="var(--accent)"
          fontWeight="600"
          className="font-ui select-none pointer-events-none"
        >
          origin · 1
        </text>
        {geometry.labels.map(label => {
          const edgeX = label.side === 'left' ? label.position.x + label.width : label.position.x;
          // When zoomed in, only draw label cards and leader lines if they are within or near the visible view
          const isVisible =
            zoom <= 1.35 ||
            (label.position.x + label.width >= viewX - 20 &&
             label.position.x <= viewX + viewW + 20 &&
             label.position.y + label.height >= viewY - 20 &&
             label.position.y <= viewY + viewH + 20);

          if (!isVisible) return null;

          const strokeW = Math.max(0.6, 1 / zoom);
          return (
            <g key={label.id} data-label-target={label.targetId}>
              <path
                d={`M ${label.anchor.x} ${label.anchor.y} L ${label.elbow.x} ${label.elbow.y} L ${edgeX} ${label.elbow.y}`}
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth={strokeW}
              />
              <rect
                x={label.position.x}
                y={label.position.y}
                width={label.width}
                height={label.height}
                rx={3}
                fill="var(--panel)"
                stroke="var(--border-strong)"
                strokeWidth={strokeW}
              />
              <text
                x={label.side === 'left' ? label.position.x + label.width - 6 : label.position.x + 6}
                y={label.position.y + label.height * 0.68}
                textAnchor={label.side === 'left' ? 'end' : 'start'}
                fontSize={label.fontSize}
                fill="var(--text)"
                fontWeight="500"
                className="font-ui"
              >
                {label.text}
              </text>
            </g>
          );
        })}
        {/* Center dial badge */}
        <circle cx={geometry.center.x} cy={geometry.center.y} r={Math.max(40, geometry.backbone.radius - 36)} fill="var(--panel)" stroke="var(--border)" opacity={0.75} />
        <g transform={`translate(${geometry.center.x} ${geometry.center.y - 18})`} pointerEvents="none">
          <text x={0} y={0} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--text)" className="font-ui">{geometry.sequenceLength.toLocaleString()} bp</text>
          <text x={0} y={19} textAnchor="middle" fontSize={11} fill="var(--text-muted)" className="font-ui">canonical circular comparison</text>
          <text x={0} y={37} textAnchor="middle" fontSize={10} fill="var(--text-secondary)" className="font-ui">outer · reference   inner · query</text>
        </g>
      </svg>

      {/* Floating Zoom & Pan Toolbar */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur-sm p-1 shadow-md">
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => changeZoom(zoom / 1.25)}
          className="grid h-7 w-7 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)] transition-colors"
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          aria-label="Reset zoom and pan"
          title="Click to reset (100%)"
          onClick={resetView}
          className="min-w-[46px] px-1 text-center font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => changeZoom(zoom * 1.25)}
          className="grid h-7 w-7 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)] transition-colors"
        >
          <Plus size={13} />
        </button>
        <div className="h-4 w-px bg-[var(--border)]" />
        <button
          type="button"
          aria-label="Reset view"
          title="Fit view to canvas"
          onClick={resetView}
          className="grid h-7 w-7 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)] transition-colors"
        >
          <Maximize2 size={12} />
        </button>
      </div>

      {/* Track Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur-sm px-2.5 py-1.5 shadow-md pointer-events-none">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
          <span className="h-2 w-2 rounded-full border border-[var(--accent)] bg-[var(--accent)]/40" />
          <span>Outer track: Reference</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
          <span className="h-2 w-2 rounded-full border border-emerald-400 bg-emerald-400/40" />
          <span>Inner track: Query</span>
        </div>
      </div>
    </div>
  );
}
