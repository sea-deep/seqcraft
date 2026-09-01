const fs = require('fs');
let code = fs.readFileSync('src/components/map/plasmid-geometry.ts', 'utf8');

const exportsToAdd = `
export function angleToCoordinate(angle: number, sequenceLength: number): number {
  let fraction = (Math.PI / 2 - angle) / (Math.PI * 2);
  fraction = fraction - Math.floor(fraction);
  return Math.round(fraction * sequenceLength) % sequenceLength;
}

export function splitSelectionIntoSegments(start0: number, end0Exclusive: number, sequenceLength: number): { start0: number; end0Exclusive: number }[] {
  if (start0 < end0Exclusive) {
    return [{ start0, end0Exclusive }];
  } else if (start0 > end0Exclusive) {
    return [
      { start0, end0Exclusive: sequenceLength },
      { start0: 0, end0Exclusive }
    ];
  }
  return [];
}
`;

code += exportsToAdd;
fs.writeFileSync('src/components/map/plasmid-geometry.ts', code);
