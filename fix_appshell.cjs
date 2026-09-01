const fs = require('fs');
let code = fs.readFileSync('src/app/AppShell.tsx', 'utf8');

// replace SequenceViewer import with WorkspaceCenter import
code = code.replace(
  /import \{ SequenceViewer \} from "\.\.\/components\/sequence\/SequenceViewer";/,
  'import { WorkspaceCenter } from "../components/workspace/WorkspaceCenter";\nimport { SequenceViewer } from "../components/sequence/SequenceViewer";'
);

const oldCenter = `<div className="absolute inset-0 flex flex-col">
              {activeDoc ? (
                <div className="flex-1 min-h-0 min-w-0 relative">
                  <SequenceViewer document={activeDoc} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-[var(--text-muted)]">
                  <p className="mb-4">No sequence loaded</p>
                  <label className="cursor-pointer bg-[var(--panel)] border border-[var(--border)] hover:bg-[var(--panel-muted)] text-[var(--text)] px-4 py-2 rounded-md text-[13px] font-medium inline-block">
                    Import FASTA/GenBank
                    <input type="file" className="hidden" accept=".fasta,.fa,.gb,.gbk,.txt" onChange={handleFileUpload} />
                  </label>
                </div>
              )}
            </div>`;

const newCenter = `<WorkspaceCenter />`;
// actually I still need the file upload thing somewhere! 
// Oh wait, WorkspaceCenter handles !activeDoc currently but doesn't have the file upload button.
// Let me update WorkspaceCenter to include the file upload button.
