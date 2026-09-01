const fs = require('fs');
let code = fs.readFileSync('src/components/map/PlasmidMap3D.tsx', 'utf8');

// imports
code = code.replace(
  /import \{ PlasmidRing \} from '\.\/PlasmidRing';/,
  "import { PlasmidRing } from './PlasmidRing';\nimport { FeatureArc3D } from './FeatureArc3D';\nimport { assignFeatureLanes } from './map-layout';"
);

// inside component
code = code.replace(
  /const formatLen = new Intl\.NumberFormat\('en-US'\)\.format\(document\.sequence\.length\);/,
  "const formatLen = new Intl.NumberFormat('en-US').format(document.sequence.length);\n  const placedFeatures = assignFeatureLanes(document.features, document.sequence.length);"
);

// Add group rotation: X rotation ≈ -18°, Y rotation ≈ 8-12°
code = code.replace(
  /<PlasmidRing \/>/,
  `<group rotation={[-18 * Math.PI / 180, 10 * Math.PI / 180, 0]}>
          <PlasmidRing />
          {placedFeatures.map((pf) => (
            <FeatureArc3D
              key={pf.feature.id}
              feature={pf.feature}
              sequenceLength={document.sequence.length}
              lane={pf.lane}
            />
          ))}
        </group>`
);

fs.writeFileSync('src/components/map/PlasmidMap3D.tsx', code);
