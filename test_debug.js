import { simulatePCR } from './src/scientific/pcr.js';

const seq = 'AAAAATGCGGGGATGCAAAA';
const fwd = { id: 'f1', name: 'f1', sequence: 'ATGC' };
const rev = { id: 'r1', name: 'r1', sequence: 'CCCC' };
const res = simulatePCR({ sequence: seq, topology: 'linear', forwardPrimer: fwd, reversePrimer: rev });
console.log(JSON.stringify(res.products, null, 2));
