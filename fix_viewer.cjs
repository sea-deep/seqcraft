const fs = require('fs');
let code = fs.readFileSync('src/components/sequence/SequenceViewer.tsx', 'utf8');

const badCode = `          const allRowFeatures = document.features.filter(f => f.type !== "source" && 
          const rowFeatures = deduplicateFeaturesForDisplay(allRowFeatures);
            f.segments.some(seg => seg.start0 < endIndex && seg.end0Exclusive > startIndex)
          );`;

const goodCode = `          const allRowFeatures = document.features.filter(f => f.type !== "source" && 
            f.segments.some(seg => seg.start0 < endIndex && seg.end0Exclusive > startIndex)
          );
          const rowFeatures = deduplicateFeaturesForDisplay(allRowFeatures);`;

code = code.replace(badCode, goodCode);
fs.writeFileSync('src/components/sequence/SequenceViewer.tsx', code);
