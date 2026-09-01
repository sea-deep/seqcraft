const fs = require('fs');

let newContent = fs.readFileSync('src/webmcp/register-seqcraft-tools.ts', 'utf-8');
newContent = newContent.replace(/digest.physicalCuts/g, 'digest.cuts');
fs.writeFileSync('src/webmcp/register-seqcraft-tools.ts', newContent);

let newTestContent = fs.readFileSync('test/webmcp/tools.test.ts', 'utf-8');
newTestContent = newTestContent.replace(`const { reverseComplementIupac } = require('../../src/scientific/restriction-analysis');`, `// handled by top level import`);
newTestContent = newTestContent.replace(/import \{ DEMO_GENBANK \} from '\.\.\/\.\.\/src\/data\/demo-workspace';/, `import { DEMO_GENBANK } from '../../src/data/demo-workspace';\nimport { reverseComplementIupac } from '../../src/scientific/restriction-analysis';`);
fs.writeFileSync('test/webmcp/tools.test.ts', newTestContent);
