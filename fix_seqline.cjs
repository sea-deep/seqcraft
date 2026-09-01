const fs = require('fs');
let code = fs.readFileSync('src/components/sequence/SequenceLine.tsx', 'utf8');

// Replace className string
code = code.replace(
  /className="absolute top-0 left-0 min-w-full px-4 hover:bg-\[var\(--panel-muted\)\] transition-colors border-b border-transparent hover:border-\[var\(--border\)\]"/,
  'className="absolute top-0 left-0 min-w-full px-4 hover:bg-[var(--panel-muted)]/20 transition-colors"'
);

// Replace padding
code = code.replace(/paddingTop: LINE_VERTICAL_PADDING \/ 2,/, "paddingTop: '6px',");
code = code.replace(/paddingBottom: LINE_VERTICAL_PADDING \/ 2,/, "paddingBottom: '6px',");

// Replace gutter
code = code.replace(
  /<div className="w-16 text-right text-\[11px\] text-\[var\(--text-muted\)\] select-none  mr-4 self-end pb-1">/,
  '<div className="w-12 text-right text-[12px] text-[var(--text-muted)] select-none mr-4 self-end h-[24px] flex items-center justify-end">'
);

// Replace Feature Tracks height
code = code.replace(
  /<div className="relative mb-1" style={{ height: tracks\.length \* 20 }}>/,
  '<div className="relative mb-1" style={{ height: tracks.length * 16 }}>'
);

// Replace text height inside
code = code.replace(
  /<div\s+className="tracking-normal font-mono text-\[14px\] relative cursor-text select-none"\s+onMouseDown={onTextMouseDown}\s+onMouseMove={onTextMouseMove}\s+>/,
  '<div \n            className="tracking-normal font-mono text-[14px] text-[var(--text)] font-medium relative cursor-text select-none h-[24px] flex items-center"\n            onMouseDown={onTextMouseDown}\n            onMouseMove={onTextMouseMove}\n          >'
);

fs.writeFileSync('src/components/sequence/SequenceLine.tsx', code);
