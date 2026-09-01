import type { RestrictionEnzyme } from '../domain/restriction';

export const BUILTIN_ENZYMES: RestrictionEnzyme[] = [
  { id: 'ecori', name: 'EcoRI', recognitionSequence: 'GAATTC', forwardCutOffset: 1, reverseCutOffset: 5 },
  { id: 'bamhi', name: 'BamHI', recognitionSequence: 'GGATCC', forwardCutOffset: 1, reverseCutOffset: 5 },
  { id: 'hindiii', name: 'HindIII', recognitionSequence: 'AAGCTT', forwardCutOffset: 1, reverseCutOffset: 5 },
  { id: 'psti', name: 'PstI', recognitionSequence: 'CTGCAG', forwardCutOffset: 5, reverseCutOffset: 1 },
  { id: 'smai', name: 'SmaI', recognitionSequence: 'CCCGGG', forwardCutOffset: 3, reverseCutOffset: 3 },
  { id: 'xbai', name: 'XbaI', recognitionSequence: 'TCTAGA', forwardCutOffset: 1, reverseCutOffset: 5 },
  { id: 'spei', name: 'SpeI', recognitionSequence: 'ACTAGT', forwardCutOffset: 1, reverseCutOffset: 5 },
  { id: 'nhei', name: 'NheI', recognitionSequence: 'GCTAGC', forwardCutOffset: 1, reverseCutOffset: 5 },
  { id: 'kpni', name: 'KpnI', recognitionSequence: 'GGTACC', forwardCutOffset: 5, reverseCutOffset: 1 },
  { id: 'saci', name: 'SacI', recognitionSequence: 'GAGCTC', forwardCutOffset: 5, reverseCutOffset: 1 },
  { id: 'noti', name: 'NotI', recognitionSequence: 'GCGGCCGC', forwardCutOffset: 2, reverseCutOffset: 6 },
];
