const fs = require('fs');
let code = fs.readFileSync('src/components/sequence/SequenceViewer.tsx', 'utf8');

code = code.replace(
  'const selectFeature = useWorkspaceStore(s => s.selectFeature);',
  'const selectFeature = useWorkspaceStore(s => s.selectFeature);\n  const selectDocumentFeature = useWorkspaceStore(s => s.selectDocumentFeature);'
);

const oldHandleClick = `  const handleFeatureClick = useCallback((feature: import('../../domain/feature').Feature, e: ReactMouseEvent) => {
    e.stopPropagation();
    const minStart = Math.min(...feature.segments.map(s => s.start0));
    const maxEnd = Math.max(...feature.segments.map(s => s.end0Exclusive));
    setSelection(document.id, minStart, maxEnd);
    selectFeature(feature.id);
  }, [selectFeature, setSelection, document.id]);`;

const newHandleClick = `  const handleFeatureClick = useCallback((feature: import('../../domain/feature').Feature, e: ReactMouseEvent) => {
    e.stopPropagation();
    selectDocumentFeature(document.id, feature.id);
  }, [selectDocumentFeature, document.id]);`;

code = code.replace(oldHandleClick, newHandleClick);
fs.writeFileSync('src/components/sequence/SequenceViewer.tsx', code);
