const fs = require('fs');
let code = fs.readFileSync('test/components/map/map-layout.test.ts', 'utf8');

code = code.replace(/assignFeatureLanes\(([^,]+),\s*100\)/g, 'assignFeatureLanes($1)');

fs.writeFileSync('test/components/map/map-layout.test.ts', code);
