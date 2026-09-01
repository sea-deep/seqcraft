const fs = require('fs');
let code = fs.readFileSync('src/components/sequence/SequenceViewer.tsx', 'utf8');

// Add store access
code = code.replace(
  /const setSelection = useWorkspaceStore\(s => s\.setSelection\);/,
  'const setSelection = useWorkspaceStore(s => s.setSelection);\n  const selectFeature = useWorkspaceStore(s => s.selectFeature);\n  const selectedFeatureId = useWorkspaceStore(s => s.selectedFeatureId);'
);

// handleLineMouseDown clears selectedFeatureId
code = code.replace(
  /setIsDragging\(true\);/,
  'setIsDragging(true);\n    selectFeature(null);'
);

// Add handleFeatureClick
code = code.replace(
  /const handleLineMouseMove = useCallback/,
  `const handleFeatureClick = useCallback((feature: import('../../domain/feature').Feature, e: ReactMouseEvent) => {
    e.stopPropagation();
    selectFeature(feature.id);
    const minStart = Math.min(...feature.segments.map(s => s.start0));
    const maxEnd = Math.max(...feature.segments.map(s => s.end0Exclusive));
    setSelection(document.id, minStart, maxEnd);
  }, [selectFeature, setSelection, document.id]);\n\n  const handleLineMouseMove = useCallback`
);

// Pass to SequenceLine
code = code.replace(
  /selection=\{lineSelection\}/,
  'selectedFeatureId={selectedFeatureId}\n              selection={lineSelection}'
);

code = code.replace(
  /onTextMouseMove=\{\(e\) => handleLineMouseMove\(e, startIndex\)\}/,
  'onTextMouseMove={(e) => handleLineMouseMove(e, startIndex)}\n              onFeatureClick={handleFeatureClick}'
);

fs.writeFileSync('src/components/sequence/SequenceViewer.tsx', code);
