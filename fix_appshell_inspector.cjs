const fs = require('fs');
let code = fs.readFileSync('src/app/AppShell.tsx', 'utf8');

const startIndex = code.indexOf('{/* Right Inspector */}');
const endIndex = code.indexOf('</PanelGroup>', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newRightInspector = `{/* Right Inspector */}
          <Panel defaultSize={300} minSize={260} maxSize={380} className="bg-[var(--panel)] flex flex-col border-l border-[var(--border)]">
            <div className="h-[36px] border-b border-[var(--border)] flex items-center px-4 shrink-0 bg-[var(--panel-muted)]">
              <Info className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
              <span className="font-ui text-[13px] font-medium text-[var(--text)]">Inspector</span>
            </div>
            <div className="flex-1 min-h-0 relative">
              <Inspector />
            </div>
          </Panel>
        `;
  
  code = code.substring(0, startIndex) + newRightInspector + code.substring(endIndex);
  fs.writeFileSync('src/app/AppShell.tsx', code);
}
