const fs = require('fs');
let code = fs.readFileSync('src/components/map/PlasmidMap3D.tsx', 'utf8');

code = code.replace(
  "import { PlasmidCameraController } from './PlasmidCameraController';",
  "import { PlasmidCameraController } from './PlasmidCameraController';\nimport { SelectionArc3D } from './SelectionArc3D';\nimport { RADIUS, FEATURE_INNER_OFFSET, FEATURE_WIDTH, FEATURE_LANE_SPACING } from './plasmid-geometry';"
);

code = code.replace(
  "const selectedFeatureId = useWorkspaceStore(s => s.selectedFeatureId);",
  "const selectedFeatureId = useWorkspaceStore(s => s.selectedFeatureId);\n  const selection = useWorkspaceStore(s => s.selection);"
);

code = code.replace(
  "const placedFeatures = assignFeatureLanes(document.features);",
  "const placedFeatures = assignFeatureLanes(document.features);\n  const maxLane = Math.max(...placedFeatures.map(pf => pf.lane), -1);\n  const selectionRadius = RADIUS + FEATURE_INNER_OFFSET + Math.max(0, maxLane) * (FEATURE_WIDTH + FEATURE_LANE_SPACING) + FEATURE_WIDTH + 0.25;"
);

// Selection render logic
const selectionRender = `
          {selection && selection.documentId === document.id && !selectedFeatureId && (
            <SelectionArc3D 
              start0={selection.start0}
              end0Exclusive={selection.end0Exclusive}
              sequenceLength={document.sequence.length}
              baseRadius={selectionRadius}
            />
          )}
        </group>
`;

code = code.replace(
  "        </group>",
  selectionRender
);

// Also we need to pass `selection` to `PlasmidCameraController` so it can focus on it if no selectedFeatureId!
code = code.replace(
  "          resetToken={resetToken}",
  "          resetToken={resetToken}\n          selection={selection?.documentId === document.id ? selection : null}"
);

fs.writeFileSync('src/components/map/PlasmidMap3D.tsx', code);
