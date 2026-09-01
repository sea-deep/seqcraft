const fs = require('fs');
let code = fs.readFileSync('src/components/sequence/SequenceLine.tsx', 'utf8');

code = code.replace(/  onTextMouseMove:\n/, '');

fs.writeFileSync('src/components/sequence/SequenceLine.tsx', code);
