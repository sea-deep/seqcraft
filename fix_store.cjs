const fs = require('fs');
let code = fs.readFileSync('src/state/workspace-store.ts', 'utf8');

// Add selectedFeatureId
code = code.replace(
  /activeView: WorkspaceView;/,
  'activeView: WorkspaceView;\n  selectedFeatureId: string | null;'
);

// Add selectFeature action
code = code.replace(
  /clearSelection: \(\) => void;/,
  'clearSelection: () => void;\n  selectFeature: (featureId: string | null) => void;'
);

// Add default state
code = code.replace(
  /selection: null,/,
  'selection: null,\n  selectedFeatureId: null,'
);

// Modify setSelection to clear selectedFeatureId
code = code.replace(
  /validateInterval\(\{ start0, end0Exclusive \}, doc\.sequence\.length\);\n    \n    return \{ selection: \{ documentId, start0, end0Exclusive \} \};/,
  'validateInterval({ start0, end0Exclusive }, doc.sequence.length);\n    \n    return { \n      selection: { documentId, start0, end0Exclusive },\n      selectedFeatureId: null\n    };'
);

// Modify clearSelection to also clear selectedFeatureId
code = code.replace(
  /clearSelection: \(\) => set\(\{ selection: null \}\),/,
  'clearSelection: () => set({ selection: null, selectedFeatureId: null }),'
);

// Modify setActiveDocument to clear selectedFeatureId if document changed
code = code.replace(
  /const nextSelection = state.selection\?.documentId === id \? state\.selection : null;/,
  'const nextSelection = state.selection?.documentId === id ? state.selection : null;\n    const nextSelectedFeatureId = state.activeDocumentId === id ? state.selectedFeatureId : null;'
);
code = code.replace(
  /return \{ activeDocumentId: id, selection: nextSelection \};/,
  'return { activeDocumentId: id, selection: nextSelection, selectedFeatureId: nextSelectedFeatureId };'
);

// Add selectFeature implementation
code = code.replace(
  /clearSelection: \(\) => set\(\{ selection: null, selectedFeatureId: null \}\),/,
  'clearSelection: () => set({ selection: null, selectedFeatureId: null }),\n  selectFeature: (id) => set({ selectedFeatureId: id }),'
);

fs.writeFileSync('src/state/workspace-store.ts', code);
