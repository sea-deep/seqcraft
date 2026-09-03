import { useState } from 'react';
import {
  circularPoint,
  circularArcPath,
  createDirectionalCircularArcGeometry,
  circularCoordinateToAngle,
} from '../map/circular-map-2d-geometry';
import type { Feature } from '../../domain/feature';

export interface PlasmidLocus {
  id: string;
  name: string;
  type: 'resistance marker' | 'promoter' | 'origin' | 'CDS' | 'misc_feature';
  start0: number;
  end0Exclusive: number;
  strand: 1 | -1;
  color: string;
  description: string;
}

export const PUC19_LOCI: PlasmidLocus[] = [
  {
    id: 'locus-ampr',
    name: 'AmpR',
    type: 'resistance marker',
    start0: 162,
    end0Exclusive: 1196,
    strand: -1,
    color: '#FF8585',
    description: 'β-lactamase resistance marker (1,034 bp)',
  },
  {
    id: 'locus-promoter',
    name: 'bla promoter',
    type: 'promoter',
    start0: 1210,
    end0Exclusive: 1298,
    strand: -1,
    color: '#F2B45B',
    description: 'Constitutive promoter (88 bp)',
  },
  {
    id: 'locus-ori',
    name: 'ori',
    type: 'origin',
    start0: 1482,
    end0Exclusive: 2070,
    strand: 1,
    color: '#35B8AC',
    description: 'pMB1 origin of replication (588 bp)',
  },
  {
    id: 'locus-lacz',
    name: 'lacZα',
    type: 'CDS',
    start0: 2380,
    end0Exclusive: 2686,
    strand: 1,
    color: '#818CF8',
    description: 'β-galactosidase α-peptide (306 bp)',
  },
  {
    id: 'locus-mcs',
    name: 'MCS',
    type: 'misc_feature',
    start0: 2397,
    end0Exclusive: 2447,
    strand: 1,
    color: '#A78BFA',
    description: 'Multiple cloning site polylinker (50 bp)',
  },
];

const RESTRICTION_MARKERS = [
  { name: 'EcoRI', bp: 396 },
  { name: 'BamHI', bp: 420 },
  { name: 'HindIII', bp: 452 },
];

const TICKS = [
  { bp: 0, label: '0/2686' },
  { bp: 500, label: '500' },
  { bp: 1000, label: '1,000' },
  { bp: 1500, label: '1,500' },
  { bp: 2000, label: '2,000' },
  { bp: 2500, label: '2,500' },
];

interface HeroPlasmidMapProps {
  selectedLocusId: string;
  onSelectLocus: (locus: PlasmidLocus) => void;
  className?: string;
}

export function HeroPlasmidMap({
  selectedLocusId,
  onSelectLocus,
  className = '',
}: HeroPlasmidMapProps) {
  const [hoveredLocusId, setHoveredLocusId] = useState<string | null>(null);

  const center = 270;
  const backboneRadius = 175;
  const ribbonRadius = 152;
  const totalBp = 2686;

  const activeId = hoveredLocusId ?? selectedLocusId;
  const activeLocus = PUC19_LOCI.find(l => l.id === activeId) ?? PUC19_LOCI[4];

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox="0 0 540 540"
        className="w-full max-w-[480px] aspect-square overflow-visible"
        role="img"
        aria-label="Interactive circular plasmid map of pUC19"
      >
        {/* Subtle circular background guide ring */}
        <circle
          cx={center}
          cy={center}
          r={backboneRadius + 40}
          fill="none"
          stroke="var(--border)"
          strokeWidth="0.75"
          strokeDasharray="2 4"
          strokeOpacity="0.4"
        />

        {/* Double-stranded plasmid backbone rings */}
        <circle
          cx={center}
          cy={center}
          r={backboneRadius}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="3"
        />
        <circle
          cx={center}
          cy={center}
          r={backboneRadius - 8}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
          strokeOpacity="0.6"
        />

        {/* Coordinate tick marks and labels */}
        {TICKS.map(({ bp, label }) => {
          const ptInner = circularPoint(bp, totalBp, backboneRadius - 2, center);
          const ptOuter = circularPoint(bp, totalBp, backboneRadius + 7, center);
          const ptLabel = circularPoint(bp, totalBp, backboneRadius + 22, center);
          return (
            <g key={bp} pointerEvents="none">
              <line
                x1={ptInner.x}
                y1={ptInner.y}
                x2={ptOuter.x}
                y2={ptOuter.y}
                stroke="var(--border-strong)"
                strokeWidth="1.25"
              />
              <text
                x={ptLabel.x}
                y={ptLabel.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[var(--text-muted)] font-mono text-[10px]"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Origin indicator at bp 1 (12 o'clock) */}
        {(() => {
          const pt1 = circularPoint(0, totalBp, backboneRadius - 6, center);
          const pt2 = circularPoint(0, totalBp, backboneRadius + 12, center);
          const ptText = circularPoint(0, totalBp, backboneRadius + 36, center);
          return (
            <g pointerEvents="none">
              <line
                x1={pt1.x}
                y1={pt1.y}
                x2={pt2.x}
                y2={pt2.y}
                stroke="var(--accent)"
                strokeWidth="2"
              />
              <circle cx={pt2.x} cy={pt2.y} r="2.5" fill="var(--accent)" />
              <text
                x={ptText.x}
                y={ptText.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[var(--accent)] font-mono text-[10px] font-bold tracking-wider"
              >
                ORIGIN · 1
              </text>
            </g>
          );
        })()}

        {/* Biological Feature Ribbons inside backbone */}
        {PUC19_LOCI.map(locus => {
          const isSelected = activeLocus.id === locus.id;
          const ribbonWidth = isSelected ? 15 : 10;

          const pseudoFeature: Feature = {
            id: locus.id,
            name: locus.name,
            type: locus.type,
            strand: locus.strand,
            segments: [{ start0: locus.start0, end0Exclusive: locus.end0Exclusive }],
            qualifiers: { note: locus.description },
            source: 'imported',
          };

          const geom = createDirectionalCircularArcGeometry(
            pseudoFeature,
            0,
            totalBp,
            ribbonRadius,
            ribbonWidth
          );

          return (
            <g
              key={locus.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectLocus(locus)}
              onMouseEnter={() => setHoveredLocusId(locus.id)}
              onMouseLeave={() => setHoveredLocusId(null)}
              className="cursor-pointer transition-opacity"
              aria-label={`${locus.name}, ${locus.type}, ${locus.start0 + 1} to ${locus.end0Exclusive} bp`}
            >
              {/* Feature Arc Path */}
              <path
                d={circularArcPath(geom.bodyInterval, totalBp, ribbonRadius, center)}
                fill="none"
                stroke={locus.color}
                strokeWidth={ribbonWidth}
                strokeLinecap="butt"
                strokeOpacity={isSelected ? 1 : 0.75}
              />

              {/* Directional Arrowhead */}
              {geom.arrowPoints && (
                <polygon
                  points={geom.arrowPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={locus.color}
                  fillOpacity={isSelected ? 1 : 0.8}
                />
              )}

              {/* High-contrast selection outline on active feature */}
              {isSelected && (
                <path
                  d={circularArcPath(
                    { start0: locus.start0, end0Exclusive: locus.end0Exclusive },
                    totalBp,
                    ribbonRadius,
                    center
                  )}
                  fill="none"
                  stroke="var(--text)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  strokeOpacity="0.8"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* Leader lines and clean biological locus labels */}
        {PUC19_LOCI.map(locus => {
          const isSelected = activeLocus.id === locus.id;
          const midBp = Math.round((locus.start0 + locus.end0Exclusive) / 2);
          const angle = circularCoordinateToAngle(midBp, totalBp);
          const isRightSide = Math.cos(angle) >= 0;

          const anchor = circularPoint(midBp, totalBp, ribbonRadius, center);
          const elbowRadius = backboneRadius + (isSelected ? 38 : 32);
          const elbow = circularPoint(midBp, totalBp, elbowRadius, center);
          const labelX = elbow.x + (isRightSide ? 14 : -14);
          const labelY = elbow.y;

          return (
            <g
              key={`label-${locus.id}`}
              pointerEvents="none"
              className="transition-opacity"
              opacity={isSelected ? 1 : 0.65}
            >
              {/* Leader Line */}
              <polyline
                points={`${anchor.x},${anchor.y} ${elbow.x},${elbow.y} ${labelX},${labelY}`}
                fill="none"
                stroke={isSelected ? locus.color : 'var(--border-strong)'}
                strokeWidth={isSelected ? 1.5 : 0.8}
              />
              {/* Locus Name Text */}
              <text
                x={labelX + (isRightSide ? 4 : -4)}
                y={labelY - 3}
                textAnchor={isRightSide ? 'start' : 'end'}
                dominantBaseline="middle"
                className={`font-mono text-[11px] ${
                  isSelected ? 'font-bold' : 'font-medium'
                }`}
                fill={isSelected ? locus.color : 'var(--text)'}
              >
                {locus.name}
              </text>
              {/* Coordinates sub-label */}
              <text
                x={labelX + (isRightSide ? 4 : -4)}
                y={labelY + 9}
                textAnchor={isRightSide ? 'start' : 'end'}
                dominantBaseline="middle"
                className="font-mono text-[9px] fill-[var(--text-muted)]"
              >
                {locus.start0 + 1}..{locus.end0Exclusive} bp
              </text>
            </g>
          );
        })}

        {/* Restriction Site Radial Markers */}
        {RESTRICTION_MARKERS.map(marker => {
          const pt1 = circularPoint(marker.bp, totalBp, backboneRadius - 10, center);
          const pt2 = circularPoint(marker.bp, totalBp, backboneRadius + 14, center);
          return (
            <g key={marker.name} pointerEvents="none">
              <line
                x1={pt1.x}
                y1={pt1.y}
                x2={pt2.x}
                y2={pt2.y}
                stroke="var(--accent)"
                strokeWidth="1.5"
              />
              <circle cx={pt2.x} cy={pt2.y} r="2" fill="var(--accent)" />
            </g>
          );
        })}

        {/* Central Locus Readout Reticle */}
        <g pointerEvents="none">
          <circle
            cx={center}
            cy={center}
            r="56"
            fill="var(--panel)"
            stroke="var(--border-strong)"
            strokeWidth="1.25"
          />
          <text
            x={center}
            y={center - 16}
            textAnchor="middle"
            className="fill-[var(--text-muted)] font-mono text-[9px] uppercase tracking-widest font-semibold"
          >
            pUC19 dsDNA
          </text>
          <text
            x={center}
            y={center + 4}
            textAnchor="middle"
            className="fill-[var(--text)] font-mono text-[16px] font-bold tracking-tight"
          >
            {activeLocus.name}
          </text>
          <text
            x={center}
            y={center + 20}
            textAnchor="middle"
            className="fill-[var(--accent)] font-mono text-[10px]"
          >
            {activeLocus.start0 + 1}..{activeLocus.end0Exclusive} bp
          </text>
        </g>
      </svg>
    </div>
  );
}
