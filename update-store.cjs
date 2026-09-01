const fs = require('fs');
let code = fs.readFileSync('src/state/workspace-store.ts', 'utf8');

code = code.replace(
  'selectFeature: (featureId: string | null) => void;',
  'selectFeature: (featureId: string | null) => void;\n  selectDocumentFeature: (documentId: string, featureId: string) => void;'
);

const oldSetSelection = `  setSelection: (documentId, start0, end0Exclusive) => set((state) => {
    const doc = state.documents.find(d => d.id === documentId);
    if (!doc) throw new Error(\`Document \${documentId} not found for selection\`);
    
    validateInterval({ start0, end0Exclusive }, doc.sequence.length);
    
    return { 
      selection: { documentId, start0, end0Exclusive },
      selectedFeatureId: null
    };
  }),`;

const newSelectMethods = `  setSelection: (documentId, start0, end0Exclusive) => set((state) => {
    const doc = state.documents.find(d => d.id === documentId);
    if (!doc) throw new Error(\`Document \${documentId} not found for selection\`);
    
    validateInterval({ start0, end0Exclusive }, doc.sequence.length);
    
    return { 
      selection: { documentId, start0, end0Exclusive },
      selectedFeatureId: null
    };
  }),
  
  selectDocumentFeature: (documentId, featureId) => set((state) => {
    const doc = state.documents.find(d => d.id === documentId);
    if (!doc) throw new Error(\`Document \${documentId} not found\`);
    
    const feature = doc.features.find(f => f.id === featureId);
    if (!feature) throw new Error(\`Feature \${featureId} not found\`);
    
    const minStart = Math.min(...feature.segments.map(s => s.start0));
    const maxEnd = Math.max(...feature.segments.map(s => s.end0Exclusive));
    
    validateInterval({ start0: minStart, end0Exclusive: maxEnd }, doc.sequence.length);
    
    return {
      selection: { documentId, start0: minStart, end0Exclusive: maxEnd },
      selectedFeatureId: featureId
    };
  }),`;

code = code.replace(oldSetSelection, newSelectMethods);
fs.writeFileSync('src/state/workspace-store.ts', code);
