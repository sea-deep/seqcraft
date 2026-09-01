const fs = require('fs');
let code = fs.readFileSync('src/components/sequence/SequenceViewer.tsx', 'utf8');

code = code.replace(
  /selectFeature\(feature.id\);\n    const minStart = Math.min\(\.\.\.feature.segments.map\(s => s.start0\)\);\n    const maxEnd = Math.max\(\.\.\.feature.segments.map\(s => s.end0Exclusive\)\);\n    setSelection\(document.id, minStart, maxEnd\);/,
  'const minStart = Math.min(...feature.segments.map(s => s.start0));\n    const maxEnd = Math.max(...feature.segments.map(s => s.end0Exclusive));\n    setSelection(document.id, minStart, maxEnd);\n    selectFeature(feature.id);'
);

fs.writeFileSync('src/components/sequence/SequenceViewer.tsx', code);
