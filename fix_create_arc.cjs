const fs = require('fs');
let code = fs.readFileSync('src/components/map/plasmid-geometry.ts', 'utf8');

// Replace createArcRibbonGeometry
const oldFunc = `export function createArcRibbonGeometry({`;
const newFunc = `export type TerminalType = 'none' | 'clockwise-arrow' | 'counterclockwise-arrow';

export function createArcRibbonGeometry({
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  depth,
  terminal = 'none',
  segments = 32
}: {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  depth: number;
  terminal?: TerminalType;
  segments?: number;
}): ExtrudeGeometry {
  const shape = new Shape();
  
  let arcLength = startAngle - endAngle;
  while (arcLength < 0) arcLength += Math.PI * 2;
  
  // A full circle cannot have an arrow natively unless it's just overlapping itself,
  // but if it's a full circle we just draw the ring
  const isFullCircle = Math.abs(arcLength - Math.PI * 2) < 0.0001;
  
  if (isFullCircle && terminal === 'none') {
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const hole = new Shape();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  } else {
    // 4-7% of the circumference is about 0.25 to 0.44 radians.
    // We cap it so it doesn't consume more than 50% of the feature length.
    const maxArrowAngle = Math.PI * 0.08;
    const arrowAngle = terminal !== 'none' ? Math.min(maxArrowAngle, arcLength * 0.5) : 0;
    
    const midRadius = (innerRadius + outerRadius) / 2;
    
    if (terminal === 'clockwise-arrow') {
      const arrowBase = endAngle + arrowAngle;
      
      shape.absarc(0, 0, outerRadius, startAngle, arrowBase, true);
      // line to tip
      shape.lineTo(Math.cos(endAngle) * midRadius, Math.sin(endAngle) * midRadius);
      // line to inner base
      shape.lineTo(Math.cos(arrowBase) * innerRadius, Math.sin(arrowBase) * innerRadius);
      shape.absarc(0, 0, innerRadius, arrowBase, startAngle, false);
      
    } else if (terminal === 'counterclockwise-arrow') {
      const arrowBase = startAngle - arrowAngle;
      
      // We start drawing from the tip? Or we can just start anywhere and the path closes itself.
      // Let's start at the tip
      shape.moveTo(Math.cos(startAngle) * midRadius, Math.sin(startAngle) * midRadius);
      // line to outer base
      shape.lineTo(Math.cos(arrowBase) * outerRadius, Math.sin(arrowBase) * outerRadius);
      // outer arc
      shape.absarc(0, 0, outerRadius, arrowBase, endAngle, true);
      // inner arc
      shape.absarc(0, 0, innerRadius, endAngle, arrowBase, false);
      // it will close itself back to the tip
      
    } else {
      shape.absarc(0, 0, outerRadius, startAngle, endAngle, true);
      shape.absarc(0, 0, innerRadius, endAngle, startAngle, false);
    }
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
    curveSegments: segments
  });
  
  geometry.translate(0, 0, -depth / 2);
  
  return geometry;
}
`;

code = code.replace(/export function createArcRibbonGeometry\(\{[\s\S]*\}\): ExtrudeGeometry \{[\s\S]*\}\n/m, newFunc);
fs.writeFileSync('src/components/map/plasmid-geometry.ts', code);
