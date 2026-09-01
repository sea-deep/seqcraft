const fs = require('fs');
let code = fs.readFileSync('src/components/sequence/SequenceLine.tsx', 'utf8');

code = code.replace(
  /onFeatureClick: \(feature: Feature, e: ReactMouseEvent\) => void; \(e: ReactMouseEvent\) => void;/,
  'onTextMouseMove: (e: ReactMouseEvent) => void;\n  onFeatureClick: (feature: Feature, e: ReactMouseEvent) => void;'
);

fs.writeFileSync('src/components/sequence/SequenceLine.tsx', code);
