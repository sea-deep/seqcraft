const fs = require('fs');
let code = fs.readFileSync('src/components/map/plasmid-geometry.ts', 'utf8');

const oldLogic = `    // 4-7% of the circumference is about 0.25 to 0.44 radians.
    // We cap it so it doesn't consume more than 50% of the feature length.
    const maxArrowAngle = Math.PI * 0.08;
    const arrowAngle = terminal !== 'none' ? Math.min(maxArrowAngle, arcLength * 0.5) : 0;
    
    const midRadius = (innerRadius + outerRadius) / 2;`;

const newLogic = `    const ribbonWidth = outerRadius - innerRadius;
    const midRadius = (innerRadius + outerRadius) / 2;
    
    // Target ~1.5x ribbon width for the arrow axial length along the arc
    const preferredArrowAngle = (1.5 * ribbonWidth) / midRadius;
    
    // Clamp to at most 60% of the arc length for short features to preserve the ribbon body
    const arrowAngle = terminal !== 'none' ? Math.min(preferredArrowAngle, arcLength * 0.6) : 0;`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/map/plasmid-geometry.ts', code);
