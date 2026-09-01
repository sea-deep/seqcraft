const fs = require('fs');
let code = fs.readFileSync('test/scientific/pcr.test.ts', 'utf-8');

const newTests = `
  it('Primer A has both a +1 and -1 binding, Primer B has zero', () => {
    // Primer A: ATGC (RC is GCAT). It binds +1 and -1.
    const seq = 'AAAAATGCGGGGGCATAAAA';
    const fwd = makePrimer('f1', 'ATGC');
    const rev = makePrimer('r1', 'CCCC'); // no bindings
    
    const result = simulatePCR({ sequence: seq, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
    expect(hasNoPCRProduct(result)).toBe(true);
  });

  it('swapped physical orientation case', () => {
    // fwd primer binds -1, rev primer binds +1
    // Let's use seq = 'AAAA ATGC GGGG CCAT AAAA'
    // +1 binding at 4 (ATGC). 
    // -1 binding at 12 (CCAT).
    // Let's make fwd = ATGG (so it binds -1 at 12).
    // Let's make rev = ATGC (so it binds +1 at 4).
    const seq = 'AAAAATGCGGGGCCATAAAA';
    const fwd = makePrimer('f1', 'ATGG'); // RC is CCAT, binds at 12 (-1)
    const rev = makePrimer('r1', 'ATGC'); // binds at 4 (+1)
    
    const result = simulatePCR({ sequence: seq, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
    expect(isUniquePCRProduct(result)).toBe(true);
    
    const prod = result.products[0];
    expect(prod.forwardBinding.primerId).toBe('r1');
    expect(prod.reverseBinding.primerId).toBe('f1');
    expect(prod.forwardPrimerId).toBe('r1');
    expect(prod.reversePrimerId).toBe('f1');
  });
`;

code = code.replace(/describe\('PCR circular semantics', \(\) => {/, newTests + '\ndescribe(\'PCR circular semantics\', () => {');
fs.writeFileSync('test/scientific/pcr.test.ts', code);
