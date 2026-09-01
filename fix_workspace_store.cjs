const fs = require('fs');
let code = fs.readFileSync('src/state/workspace-store.ts', 'utf8');

// Insert type
code = code.replace(
  /interface WorkspaceState {/,
  'export type WorkspaceView = "sequence" | "map" | "compare";\n\ninterface WorkspaceState {\n  activeView: WorkspaceView;'
);

// Insert action
code = code.replace(
  /setActiveDocument: \(id: string\) => void;/,
  'setActiveDocument: (id: string) => void;\n  setActiveView: (view: WorkspaceView) => void;'
);

// Insert state
code = code.replace(
  /activeDocumentId: null,/,
  'activeDocumentId: null,\n  activeView: "sequence",'
);

// Insert implementation
code = code.replace(
  /setActiveDocument: \(id\) => set\(\(state\) => {/,
  'setActiveView: (view) => set({ activeView: view }),\n\n  setActiveDocument: (id) => set((state) => {'
);

fs.writeFileSync('src/state/workspace-store.ts', code);
