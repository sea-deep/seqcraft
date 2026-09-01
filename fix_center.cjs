const fs = require('fs');
let code = fs.readFileSync('src/app/AppShell.tsx', 'utf8');

const oldCenter = `<div className="absolute inset-0 flex items-center justify-center">
              {activeDoc ? (
                <SequenceViewer document={activeDoc} />
              ) : (
                <div className="text-center text-[var(--text-muted)]">`;

const newCenter = `<div className="absolute inset-0 flex flex-col">
              {activeDoc ? (
                <div className="flex-1 min-h-0 min-w-0 relative">
                  <SequenceViewer document={activeDoc} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-[var(--text-muted)]">`;

code = code.replace(oldCenter, newCenter);
fs.writeFileSync('src/app/AppShell.tsx', code);
