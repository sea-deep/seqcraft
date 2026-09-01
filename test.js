import { importGenBank } from './src/import/genbank.js';
import { DEMO_GENBANK } from './src/data/demo-workspace.js';
import { analyzePrimerBindings } from './src/scientific/primer-binding.js';

const pUC19Doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
const seq = pUC19Doc.sequence.raw;
console.log('bases 99-121:', seq.substring(99, 121));
console.log('bases 199-220:', seq.substring(199, 220));

const fwdPrimer = { id: 'p1', name: 'fwd', sequence: seq.substring(99, 121) };
console.log('fwdPrimer bindings:', analyzePrimerBindings(seq, 'circular', fwdPrimer));
