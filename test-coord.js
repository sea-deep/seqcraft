import { BUILTIN_ENZYMES } from './src/data/restriction-enzymes.js';
import { analyzeRestrictionSites } from './src/scientific/restriction-analysis.js';
import { DEMO_GENBANK } from './src/data/demo-workspace.js';
import { importGenBank } from './src/import/genbank.js';

const seq = importGenBank(DEMO_GENBANK, 'p')[0].sequence.raw;
const sites = analyzeRestrictionSites(seq, 'circular', BUILTIN_ENZYMES);
const e = sites.find(s => s.enzymeId === 'ecori');
const h = sites.find(s => s.enzymeId === 'hindiii');
const b = sites.find(s => s.enzymeId === 'bamhi');
console.log('E', e.forwardCut0);
console.log('H', h.forwardCut0);
console.log('B', b.forwardCut0);
