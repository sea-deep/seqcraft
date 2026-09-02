import type { ArcGeometry, CircularDiffGeometry, Point2D } from '../geometry/circular-diff-geometry';

function number(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function arcToSvgPath(arc: ArcGeometry): string {
  if (arc.fullCircle) {
    const opposite: Point2D = { x: arc.center.x - (arc.start.x - arc.center.x), y: arc.center.y - (arc.start.y - arc.center.y) };
    return `M ${number(arc.start.x)} ${number(arc.start.y)} A ${number(arc.radius)} ${number(arc.radius)} 0 1 1 ${number(opposite.x)} ${number(opposite.y)} A ${number(arc.radius)} ${number(arc.radius)} 0 1 1 ${number(arc.start.x)} ${number(arc.start.y)}`;
  }
  let sweep = arc.endAngle - arc.startAngle;
  while (sweep < 0) sweep += Math.PI * 2;
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${number(arc.start.x)} ${number(arc.start.y)} A ${number(arc.radius)} ${number(arc.radius)} 0 ${largeArc} 1 ${number(arc.end.x)} ${number(arc.end.y)}`;
}

export interface CircularDiffSvgOptions { includeBackground?: boolean; background?: string }

export function circularDiffGeometryToSvg(geometry: CircularDiffGeometry, options: CircularDiffSvgOptions = {}): string {
  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${number(geometry.width)} ${number(geometry.height)}" role="img" aria-label="canonical circular sequence difference map">`];
  if (options.includeBackground ?? true) lines.push(`<rect width="100%" height="100%" fill="${escapeXml(options.background ?? geometry.colors.labelBackground)}"/>`);
  lines.push(`<path d="${arcToSvgPath(geometry.backbone)}" fill="none" stroke="${escapeXml(geometry.backbone.color)}" stroke-width="${number(geometry.backbone.width)}"/>`);
  for (const feature of geometry.featureArcs) {
    lines.push(`<path data-id="${escapeXml(feature.id)}" data-strand="${feature.strand}" data-diff-kind="${feature.diffKind ?? ''}" d="${arcToSvgPath(feature)}" fill="none" stroke="${escapeXml(feature.color)}" stroke-width="${number(feature.width)}" stroke-linecap="round" opacity="${number(feature.opacity)}"/>`);
    if (feature.arrow) lines.push(`<polygon data-arrow-for="${escapeXml(feature.id)}" points="${number(feature.arrow.tip.x)},${number(feature.arrow.tip.y)} ${number(feature.arrow.left.x)},${number(feature.arrow.left.y)} ${number(feature.arrow.right.x)},${number(feature.arrow.right.y)}" fill="${escapeXml(feature.color)}" opacity="${number(feature.opacity)}"/>`);
  }
  for (const difference of geometry.differences) {
    if (difference.kind === 'insertion') {
      lines.push(`<circle data-id="${escapeXml(difference.id)}" cx="${number(difference.marker.x)}" cy="${number(difference.marker.y)}" r="${number(difference.width / 2)}" fill="${escapeXml(difference.color)}"/>`);
    } else {
      lines.push(`<path data-id="${escapeXml(difference.id)}" d="${arcToSvgPath(difference)}" fill="none" stroke="${escapeXml(difference.color)}" stroke-width="${number(difference.width)}" stroke-linecap="butt"/>`);
    }
  }
  lines.push(`<line x1="${number(geometry.origin.inner.x)}" y1="${number(geometry.origin.inner.y)}" x2="${number(geometry.origin.outer.x)}" y2="${number(geometry.origin.outer.y)}" stroke="${escapeXml(geometry.origin.color)}" stroke-width="3"/>`);
  lines.push(`<text x="${number(geometry.origin.label.x)}" y="${number(geometry.origin.label.y)}" text-anchor="middle" font-size="10" fill="${escapeXml(geometry.colors.textMuted)}">1</text>`);
  for (const label of geometry.labels) {
    const textX = label.side === 'left' ? label.position.x + label.width - 5 : label.position.x + 5;
    const anchor = label.side === 'left' ? 'end' : 'start';
    const edgeX = label.side === 'left' ? label.position.x + label.width : label.position.x;
    lines.push(`<path d="M ${number(label.anchor.x)} ${number(label.anchor.y)} L ${number(label.elbow.x)} ${number(label.elbow.y)} L ${number(edgeX)} ${number(label.elbow.y)}" fill="none" stroke="${escapeXml(label.border)}" stroke-width="1"/>`);
    lines.push(`<rect x="${number(label.position.x)}" y="${number(label.position.y)}" width="${number(label.width)}" height="${number(label.height)}" rx="3" fill="${escapeXml(label.background)}" stroke="${escapeXml(label.border)}"/>`);
    lines.push(`<text x="${number(textX)}" y="${number(label.position.y + label.height * 0.68)}" text-anchor="${anchor}" font-family="IBM Plex Sans, sans-serif" font-size="${number(label.fontSize)}" fill="${escapeXml(label.color)}">${escapeXml(label.text)}</text>`);
  }
  lines.push('</svg>');
  return lines.join('');
}
