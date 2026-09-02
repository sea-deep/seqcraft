import type { CircularDiffGeometry } from '../geometry/circular-diff-geometry';

export type CircularDiffCanvasCommand =
  | { kind: 'arc'; id: string; centerX: number; centerY: number; radius: number; startAngle: number; endAngle: number; width: number; color: string; opacity: number }
  | { kind: 'circle'; id: string; x: number; y: number; radius: number; color: string; opacity: number }
  | { kind: 'line'; id: string; x1: number; y1: number; x2: number; y2: number; width: number; color: string; opacity: number }
  | { kind: 'polygon'; id: string; points: Array<{ x: number; y: number }>; color: string; opacity: number }
  | { kind: 'label'; id: string; text: string; x: number; y: number; width: number; height: number; fontSize: number; color: string; background: string; border: string; align: 'left' | 'right'; opacity: number };

export function circularDiffGeometryToCanvasCommands(geometry: CircularDiffGeometry): CircularDiffCanvasCommand[] {
  const commands: CircularDiffCanvasCommand[] = [{
    kind: 'arc', id: 'backbone', centerX: geometry.center.x, centerY: geometry.center.y,
    radius: geometry.backbone.radius, startAngle: geometry.backbone.startAngle, endAngle: geometry.backbone.endAngle,
    width: geometry.backbone.width, color: geometry.backbone.color, opacity: 1,
  }];
  for (const feature of geometry.featureArcs) {
    commands.push({ kind: 'arc', id: feature.id, centerX: feature.center.x, centerY: feature.center.y, radius: feature.radius, startAngle: feature.startAngle, endAngle: feature.endAngle, width: feature.width, color: feature.color, opacity: feature.opacity });
    if (feature.arrow) commands.push({ kind: 'polygon', id: `${feature.id}:arrow`, points: [feature.arrow.tip, feature.arrow.left, feature.arrow.right], color: feature.color, opacity: feature.opacity });
  }
  for (const difference of geometry.differences) {
    commands.push(difference.kind === 'insertion'
      ? { kind: 'circle', id: difference.id, x: difference.marker.x, y: difference.marker.y, radius: difference.width / 2, color: difference.color, opacity: 1 }
      : { kind: 'arc', id: difference.id, centerX: difference.center.x, centerY: difference.center.y, radius: difference.radius, startAngle: difference.startAngle, endAngle: difference.endAngle, width: difference.width, color: difference.color, opacity: 1 });
  }
  commands.push({ kind: 'line', id: 'origin', x1: geometry.origin.inner.x, y1: geometry.origin.inner.y, x2: geometry.origin.outer.x, y2: geometry.origin.outer.y, width: 3, color: geometry.origin.color, opacity: 1 });
  for (const label of geometry.labels) {
    commands.push({ kind: 'line', id: `${label.id}:leader`, x1: label.anchor.x, y1: label.anchor.y, x2: label.elbow.x, y2: label.elbow.y, width: 1, color: label.border, opacity: 1 });
    commands.push({ kind: 'label', id: label.id, text: label.text, x: label.position.x, y: label.position.y, width: label.width, height: label.height, fontSize: label.fontSize, color: label.color, background: label.background, border: label.border, align: label.side, opacity: 1 });
  }
  return commands;
}

export function renderCircularDiffToCanvas(context: CanvasRenderingContext2D, geometry: CircularDiffGeometry): void {
  for (const command of circularDiffGeometryToCanvasCommands(geometry)) {
    context.save();
    context.globalAlpha = command.opacity ?? 1;
    if (command.kind === 'arc') {
      context.beginPath();
      context.arc(command.centerX, command.centerY, command.radius, command.startAngle, command.endAngle, false);
      context.lineWidth = command.width;
      context.strokeStyle = command.color;
      context.stroke();
    } else if (command.kind === 'circle') {
      context.beginPath();
      context.arc(command.x, command.y, command.radius, 0, Math.PI * 2);
      context.fillStyle = command.color;
      context.fill();
    } else if (command.kind === 'line') {
      context.beginPath();
      context.moveTo(command.x1, command.y1);
      context.lineTo(command.x2, command.y2);
      context.lineWidth = command.width;
      context.strokeStyle = command.color;
      context.stroke();
    } else if (command.kind === 'polygon') {
      context.beginPath();
      context.moveTo(command.points[0].x, command.points[0].y);
      for (const point of command.points.slice(1)) context.lineTo(point.x, point.y);
      context.closePath();
      context.fillStyle = command.color;
      context.fill();
    } else {
      context.fillStyle = command.background;
      context.strokeStyle = command.border;
      context.fillRect(command.x, command.y, command.width, command.height);
      context.strokeRect(command.x, command.y, command.width, command.height);
      context.fillStyle = command.color;
      context.font = `${command.fontSize}px IBM Plex Sans, sans-serif`;
      context.textAlign = command.align === 'left' ? 'right' : 'left';
      context.textBaseline = 'middle';
      context.fillText(command.text, command.align === 'left' ? command.x + command.width - 5 : command.x + 5, command.y + command.height / 2);
    }
    context.restore();
  }
}
