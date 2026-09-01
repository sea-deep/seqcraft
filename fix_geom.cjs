const fs = require('fs');
let code = fs.readFileSync('src/components/sequence/sequence-geometry.ts', 'utf8');
code = code.replace(/export const TRACK_HEIGHT = 16;/, 'export const TRACK_HEIGHT = 14;');
code = code.replace(/export const TRACK_GAP = 4;/, 'export const TRACK_GAP = 2;');
fs.writeFileSync('src/components/sequence/sequence-geometry.ts', code);
