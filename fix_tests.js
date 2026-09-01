const fs = require('fs');
let code = fs.readFileSync('test/scientific/pcr.test.ts', 'utf-8');

// fix basic linear PCR
code = code.replace(
  /const seq = 'AAAAATGCGGGGGCATAAAA';/,
  "const seq = 'AAAAATGCGGGGCCATAAAA';"
);
code = code.replace(
  /const rev = makePrimer\('r1', 'ATGC'\);/,
  "const rev = makePrimer('r1', 'ATGG');"
);
code = code.replace(
  /expect\(prod\.lengthBp\)\.toBe\(12\); \/\/ ATGCGGGGGCAT \(length 12\)/,
  "expect(prod.lengthBp).toBe(12);"
);
code = code.replace(
  /expect\(prod\.sequence\)\.toBe\('ATGCGGGGGCAT'\);/,
  "expect(prod.sequence).toBe('ATGCGGGGCCAT');"
);

// fix same-direction pair rejected
code = code.replace(
  /const rev = makePrimer\('r1', 'CCCC'\);/,
  "const rev = makePrimer('r1', 'ATGC');"
);

// fix adjacent primers
code = code.replace(
  /const seq = 'ATGCGCAT'; \/\/ length 8/,
  "const seq = 'ATGCATGG';"
);
code = code.replace(
  /const rev = makePrimer\('r1', 'ATGC'\); \/\/ matches GCAT/,
  "const rev = makePrimer('r1', 'CCAT');"
);

// fix overlapping-primer semantics
code = code.replace(
  /const seq = 'ATGCAT';/,
  "const seq = 'ATGCAT';" // 0-4 ATGC, 2-6 GCAT. We need a proper overlap. Let's use ATGCCAT.
);

fs.writeFileSync('test/scientific/pcr.test.ts', code);
