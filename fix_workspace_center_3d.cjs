const fs = require('fs');
let code = fs.readFileSync('src/components/workspace/WorkspaceCenter.tsx', 'utf8');

// Add import
code = code.replace(
  /import \{ SequenceViewer \} from '\.\.\/sequence\/SequenceViewer';/,
  "import { SequenceViewer } from '../sequence/SequenceViewer';\nimport { PlasmidMap3D } from '../map/PlasmidMap3D';"
);

// Replace map empty state
const badMap = `        {activeView === 'map' && (
          <div className="h-full w-full flex items-center justify-center text-center p-8">
            <div className="text-[var(--text-muted)]">
              <h2 className="text-[16px] text-[var(--text)] font-semibold mb-2">Circular map</h2>
              <p>Plasmid map view will appear here.</p>
            </div>
          </div>
        )}`;

const goodMap = `        {activeView === 'map' && (
          <PlasmidMap3D document={activeDoc} />
        )}`;

code = code.replace(badMap, goodMap);
fs.writeFileSync('src/components/workspace/WorkspaceCenter.tsx', code);
