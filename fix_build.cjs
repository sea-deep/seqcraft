const fs = require('fs');
let code = fs.readFileSync('src/webmcp/register-seqcraft-tools.ts', 'utf-8');

code = code.replace(/import type \{ ModelContext, WebMCPTool \} from '\.\/types';/, `import type { ModelContext } from './types';`);
code = code.replace(/alphabet: doc\.type,/, `alphabet: doc.alphabet,`);
code = code.replace(/overhangSequence: f\.leftEnd\.overhangSequence,/g, `overhangSequence: f.leftEnd.sequence,`);
code = code.replace(/overhangSequence: f\.rightEnd\.overhangSequence,/g, `overhangSequence: f.rightEnd.sequence,`);

fs.writeFileSync('src/webmcp/register-seqcraft-tools.ts', code);
