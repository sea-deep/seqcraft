const fs = require('fs');
const content = fs.readFileSync('src/app/AppShell.tsx', 'utf-8');

const replacement1 = `import { Inspector } from "../components/inspector/Inspector";
import { WebMCPBridge } from "../webmcp/WebMCPBridge";
import { useActivityStore } from "../state/activity-store";`;

const newContent1 = content.replace(`import { Inspector } from "../components/inspector/Inspector";`, replacement1);

const replacement2 = `      <WebMCPBridge />
    </div>
  );
}`;

const target2 = `      <footer className="h-[32px] flex-none border-t border-[var(--border)] bg-[var(--panel-muted)] flex items-center px-4 text-[12px] text-[var(--text-muted)]">
        Agent activity · 0 tools used
      </footer>
    </div>
  );
}`;

const replacement3 = `      <footer className="h-[32px] flex-none border-t border-[var(--border)] bg-[var(--panel-muted)] flex items-center px-4 text-[12px] text-[var(--text-muted)]">
        Agent activity · {useActivityStore(s => s.events.length)} tools used
      </footer>
      <WebMCPBridge />
    </div>
  );
}`;

const newContent2 = newContent1.replace(target2, replacement3);

fs.writeFileSync('src/app/AppShell.tsx', newContent2);
