const fs = require('fs');
let code = fs.readFileSync('test/scientific/primer.test.ts', 'utf-8');
code = code.replace(
  /const bindings = analyzePrimerBindings\('A----TGC', 'circular', makePrimer\('p1', 'TGCA'\)\);/,
  "const bindings = analyzePrimerBindings('A----TGA', 'circular', makePrimer('p1', 'TGAA'));"
);
code = code.replace(
  /const fwdPrimer = makePrimer\('fwd', 'TGGCGTAATAGCGAAGAGGCCC'\);/,
  "const fwdPrimer = makePrimer('fwd', pUC19Seq.substring(99, 121));"
);
code = code.replace(
  /const revPrimer = makePrimer\('rev', 'ACGCCGGACGCATCGTGGCCG'\);/,
  "import { reverseComplementIupac } from '../../src/scientific/restriction-analysis';\n  const revPrimer = makePrimer('rev', reverseComplementIupac(pUC19Seq.substring(199, 220)));"
);
fs.writeFileSync('test/scientific/primer.test.ts', code);
