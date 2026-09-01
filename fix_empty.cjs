const fs = require('fs');
let code = fs.readFileSync('src/components/workspace/WorkspaceCenter.tsx', 'utf8');

const badEmpty = `      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-[var(--text-muted)]">
          <p className="mb-4">No sequence loaded</p>
        </div>
      </div>`;

const goodEmpty = `      <div className="absolute inset-0 flex flex-col">
        <div className="flex-1 flex items-center justify-center text-center text-[var(--text-muted)]">
          <div>
            <p className="mb-4">No sequence loaded</p>
            <label className="cursor-pointer bg-[var(--panel)] border border-[var(--border)] hover:bg-[var(--panel-muted)] text-[var(--text)] px-4 py-2 rounded-md text-[13px] font-medium inline-block">
              Import FASTA/GenBank
              <input type="file" className="hidden" accept=".fasta,.fa,.gb,.gbk,.txt" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </div>`;

code = code.replace(badEmpty, goodEmpty);
fs.writeFileSync('src/components/workspace/WorkspaceCenter.tsx', code);
