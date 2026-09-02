import type { CircularDiffGeometry } from '../../geometry/circular-diff-geometry';
import { arcToSvgPath } from '../../export/circular-diff-svg';

export function CircularDiffMap2D({ geometry, onSelectDifference }: { geometry: CircularDiffGeometry; onSelectDifference?: (differenceId: string) => void }) {
  return (
    <svg
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      className="h-full min-h-[440px] w-full"
      role="img"
      aria-label={`Canonical circular difference map, ${geometry.differences.length} base differences`}
      data-geometry-id={geometry.id}
    >
      <path d={arcToSvgPath(geometry.backbone)} fill="none" stroke={geometry.backbone.color} strokeWidth={geometry.backbone.width} />
      {geometry.featureArcs.map(feature => (
        <g key={feature.id}>
        <path
          data-feature-id={feature.featureId}
          data-molecule={feature.molecule}
          data-strand={feature.strand}
          data-diff-kind={feature.diffKind ?? undefined}
          d={arcToSvgPath(feature)}
          fill="none"
          stroke={feature.color}
          strokeWidth={feature.width}
          strokeLinecap="round"
          opacity={feature.opacity}
        >
          <title>{`${feature.molecule === 'reference' ? 'Reference' : 'Query'} · ${feature.label} · ${feature.strand === 1 ? 'forward' : 'reverse'} strand${feature.diffKind ? ` · ${feature.diffKind}` : ''}`}</title>
        </path>
        {feature.arrow && <polygon points={`${feature.arrow.tip.x},${feature.arrow.tip.y} ${feature.arrow.left.x},${feature.arrow.left.y} ${feature.arrow.right.x},${feature.arrow.right.y}`} fill={feature.color} opacity={feature.opacity} pointerEvents="none" />}
        </g>
      ))}
      {geometry.differences.map(difference => difference.kind === 'insertion' ? (
        <circle
          key={difference.id}
          data-difference-id={difference.differenceId}
          cx={difference.marker.x}
          cy={difference.marker.y}
          r={difference.width / 2}
          fill={difference.color}
          className="cursor-pointer"
          onClick={() => onSelectDifference?.(difference.differenceId)}
        ><title>{`Insertion · ${difference.queryBases}`}</title></circle>
      ) : (
        <path
          key={difference.id}
          data-difference-id={difference.differenceId}
          d={arcToSvgPath(difference)}
          fill="none"
          stroke={difference.color}
          strokeWidth={difference.width}
          className="cursor-pointer"
          onClick={() => onSelectDifference?.(difference.differenceId)}
        ><title>{`${difference.kind} · ${difference.referenceBases || '∅'} → ${difference.queryBases || '∅'}`}</title></path>
      ))}
      <line x1={geometry.origin.inner.x} y1={geometry.origin.inner.y} x2={geometry.origin.outer.x} y2={geometry.origin.outer.y} stroke={geometry.origin.color} strokeWidth={3} />
      <text x={geometry.origin.label.x} y={geometry.origin.label.y} textAnchor="middle" fontSize={10} fill={geometry.colors.textMuted}>canonical origin · 1</text>
      {geometry.labels.map(label => {
        const edgeX = label.side === 'left' ? label.position.x + label.width : label.position.x;
        return (
          <g key={label.id} data-label-target={label.targetId}>
            <path d={`M ${label.anchor.x} ${label.anchor.y} L ${label.elbow.x} ${label.elbow.y} L ${edgeX} ${label.elbow.y}`} fill="none" stroke={label.border} strokeWidth={1} />
            <rect x={label.position.x} y={label.position.y} width={label.width} height={label.height} rx={3} fill={label.background} stroke={label.border} />
            <text x={label.side === 'left' ? label.position.x + label.width - 5 : label.position.x + 5} y={label.position.y + label.height * 0.68} textAnchor={label.side === 'left' ? 'end' : 'start'} fontSize={label.fontSize} fill={label.color}>{label.text}</text>
          </g>
        );
      })}
      <g transform={`translate(${geometry.center.x - 86} ${geometry.center.y - 22})`} pointerEvents="none">
        <text x={86} y={0} textAnchor="middle" fontSize={15} fontWeight={600} fill={geometry.colors.text}>{geometry.sequenceLength.toLocaleString()} bp</text>
        <text x={86} y={19} textAnchor="middle" fontSize={11} fill={geometry.colors.textMuted}>canonical circular comparison</text>
        <text x={86} y={37} textAnchor="middle" fontSize={10} fill={geometry.colors.textMuted}>outer · reference   inner · query</text>
      </g>
    </svg>
  );
}
