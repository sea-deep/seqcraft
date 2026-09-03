import type { RestrictionEnzyme } from '../domain/restriction';

/**
 * Comprehensive commercial restriction endonuclease registry for SeqCraft.
 * Includes common cloning enzymes, rare 8-cutters, diagnostic 4-cutters,
 * and Type IIS multi-part assembly endonucleases (Golden Gate / MoClo).
 *
 * Data verified against REBASE and NEB reference catalogues.
 */
export const BUILTIN_ENZYMES: RestrictionEnzyme[] = [
  // ─── Common Cloning & Standard Type II ────────────────────────────────
  { id: 'ecori', name: 'EcoRI', recognitionSequence: 'GAATTC', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher', 'Promega'] },
  { id: 'bamhi', name: 'BamHI', recognitionSequence: 'GGATCC', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher', 'Promega'] },
  { id: 'hindiii', name: 'HindIII', recognitionSequence: 'AAGCTT', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher', 'Promega'] },
  { id: 'psti', name: 'PstI', recognitionSequence: 'CTGCAG', forwardCutOffset: 5, reverseCutOffset: 1, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '3prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher', 'Promega'] },
  { id: 'ecorv', name: 'EcoRV', recognitionSequence: 'GATATC', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'smai', name: 'SmaI', aliases: ['Cfr9I', 'XmaCI'], recognitionSequence: 'CCCGGG', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'xbai', name: 'XbaI', recognitionSequence: 'TCTAGA', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'spei', name: 'SpeI', aliases: ['BcuI'], recognitionSequence: 'ACTAGT', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'nhei', name: 'NheI', aliases: ['BmtI'], recognitionSequence: 'GCTAGC', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'kpni', name: 'KpnI', recognitionSequence: 'GGTACC', forwardCutOffset: 5, reverseCutOffset: 1, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '3prime', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'acc65i', name: 'Acc65I', aliases: ['Asp718I'], recognitionSequence: 'GGTACC', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'saci', name: 'SacI', aliases: ['SstI'], recognitionSequence: 'GAGCTC', forwardCutOffset: 5, reverseCutOffset: 1, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'sali', name: 'SalI', recognitionSequence: 'GTCGAC', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'clai', name: 'ClaI', aliases: ['BspDI', 'Bsu15I'], recognitionSequence: 'ATCGAT', forwardCutOffset: 2, reverseCutOffset: 4, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 2, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'xhoi', name: 'XhoI', aliases: ['PaeR7I', 'SlaI'], recognitionSequence: 'CTCGAG', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'apai', name: 'ApaI', recognitionSequence: 'GGGCCC', forwardCutOffset: 5, reverseCutOffset: 1, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'ncoi', name: 'NcoI', aliases: ['Bsp19I'], recognitionSequence: 'CCATGG', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'ndei', name: 'NdeI', recognitionSequence: 'CATATG', forwardCutOffset: 2, reverseCutOffset: 4, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 2, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'bglii', name: 'BglII', recognitionSequence: 'AGATCT', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'agei', name: 'AgeI', aliases: ['BshTI', 'PinAI', 'AsiGI'], recognitionSequence: 'ACCGGT', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'mlui', name: 'MluI', aliases: ['BpiI'], recognitionSequence: 'ACGCGT', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'avrii', name: 'AvrII', aliases: ['BlnI', 'XmaJI'], recognitionSequence: 'CCTAGG', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'bsiwi', name: 'BsiWI', aliases: ['Bspl407I'], recognitionSequence: 'CGTACG', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'bspei', name: 'BspEI', aliases: ['AccIII', 'BseAI'], recognitionSequence: 'TCCGGA', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'bsu36i', name: 'Bsu36I', aliases: ['Eco81I'], recognitionSequence: 'CCTNAGG', forwardCutOffset: 2, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 3, overhangPolarity: '5prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'drai', name: 'DraI', aliases: ['AhaIII'], recognitionSequence: 'TTTAAA', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'econi', name: 'EcoNI', aliases: ['BstENI'], recognitionSequence: 'CCTNNNNNAGG', forwardCutOffset: 5, reverseCutOffset: 6, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: false, overhangLength: 1, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'hpai', name: 'HpaI', aliases: ['KspAI'], recognitionSequence: 'GTTAAC', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'kasi', name: 'KasI', recognitionSequence: 'GGCGCC', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'nari', name: 'NarI', recognitionSequence: 'GGCGCC', forwardCutOffset: 2, reverseCutOffset: 4, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 2, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'sfoi', name: 'SfoI', recognitionSequence: 'GGCGCC', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'naei', name: 'NaeI', aliases: ['CdoI', 'SauBM1I'], recognitionSequence: 'GCCGGC', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: false, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'nrui', name: 'NruI', aliases: ['Bsp68I', 'RruI'], recognitionSequence: 'TCGCGA', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'ppumi', name: 'PpuMI', aliases: ['Psp5II'], recognitionSequence: 'RGGWCCY', forwardCutOffset: 2, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: false, overhangLength: 3, overhangPolarity: '5prime', heatInactivationC: 'none', supplierAvailability: ['NEB'] },
  { id: 'pshai', name: 'PshAI', aliases: ['BoxI'], recognitionSequence: 'GACNNNNGTC', forwardCutOffset: 5, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: false, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'pspomi', name: 'PspOMI', aliases: ['Bsp120I'], recognitionSequence: 'GGGCCC', forwardCutOffset: 1, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'pvui', name: 'PvuI', aliases: ['BspCI', 'Ple19I'], recognitionSequence: 'CGATCG', forwardCutOffset: 4, reverseCutOffset: 2, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 2, overhangPolarity: '3prime', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'pvuii', name: 'PvuII', recognitionSequence: 'CAGCTG', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'sacii', name: 'SacII', aliases: ['Cfr42I', 'KspI', 'SstII'], recognitionSequence: 'CCGCGG', forwardCutOffset: 4, reverseCutOffset: 2, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 2, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'scai', name: 'ScaI', aliases: ['AssI'], recognitionSequence: 'AGTACT', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'snabi', name: 'SnaBI', aliases: ['BstSNI', 'Eco105I'], recognitionSequence: 'TACGTA', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: false, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'sphi', name: 'SphI', aliases: ['PaeI'], recognitionSequence: 'GCATGC', forwardCutOffset: 5, reverseCutOffset: 1, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'srfi', name: 'SrfI', recognitionSequence: 'GCCCGGGC', forwardCutOffset: 4, reverseCutOffset: 4, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: false, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 'none', supplierAvailability: ['Agilent', 'Stratagene'] },
  { id: 'sspi', name: 'SspI', recognitionSequence: 'AATATT', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'stui', name: 'StuI', aliases: ['AatI', 'Eco147I'], recognitionSequence: 'AGGCCT', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'tth111i', name: 'Tth111I', aliases: ['AspI', 'PflFI'], recognitionSequence: 'GACNNNGTC', forwardCutOffset: 4, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: false, overhangLength: 1, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'xmni', name: 'XmnI', aliases: ['Asp700I', 'PdmI'], recognitionSequence: 'GAANNNNTTC', forwardCutOffset: 5, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'zrai', name: 'ZraI', recognitionSequence: 'GACGTC', forwardCutOffset: 3, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: false, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'aatii', name: 'AatII', recognitionSequence: 'GACGTC', forwardCutOffset: 5, reverseCutOffset: 1, enzymeClass: 'type_ii', category: 'common_cloning', isCommon: true, overhangLength: 4, overhangPolarity: '3prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },

  // ─── Rare 8-Cutters & Homing ──────────────────────────────────────────
  { id: 'noti', name: 'NotI', aliases: ['CspI'], recognitionSequence: 'GCGGCCGC', forwardCutOffset: 2, reverseCutOffset: 6, enzymeClass: 'type_ii', category: 'rare_cutter', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'asci', name: 'AscI', aliases: ['PalAI', 'SgsI'], recognitionSequence: 'GGCGCGCC', forwardCutOffset: 2, reverseCutOffset: 6, enzymeClass: 'type_ii', category: 'rare_cutter', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'fsei', name: 'FseI', recognitionSequence: 'GGCCGGCC', forwardCutOffset: 6, reverseCutOffset: 2, enzymeClass: 'type_ii', category: 'rare_cutter', isCommon: true, overhangLength: 4, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'paci', name: 'PacI', recognitionSequence: 'TTAATTAA', forwardCutOffset: 5, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'rare_cutter', isCommon: true, overhangLength: 2, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'sbfi', name: 'SbfI', aliases: ['SdaI'], recognitionSequence: 'CCTGCAGG', forwardCutOffset: 6, reverseCutOffset: 2, enzymeClass: 'type_ii', category: 'rare_cutter', isCommon: true, overhangLength: 4, overhangPolarity: '3prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'sfii', name: 'SfiI', recognitionSequence: 'GGCCNNNNNGGCC', forwardCutOffset: 8, reverseCutOffset: 5, enzymeClass: 'type_ii', category: 'rare_cutter', isCommon: true, overhangLength: 3, overhangPolarity: '3prime', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'pmei', name: 'PmeI', aliases: ['MssI'], recognitionSequence: 'GTTTAAAC', forwardCutOffset: 4, reverseCutOffset: 4, enzymeClass: 'type_ii', category: 'rare_cutter', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'swai', name: 'SwaI', aliases: ['SmiI'], recognitionSequence: 'ATTTAAAT', forwardCutOffset: 4, reverseCutOffset: 4, enzymeClass: 'type_ii', category: 'rare_cutter', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'asisi', name: 'AsiSI', aliases: ['RfaI', 'SfaAI'], recognitionSequence: 'GCGATCGC', forwardCutOffset: 5, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'rare_cutter', isCommon: true, overhangLength: 2, overhangPolarity: '3prime', heatInactivationC: 'none', supplierAvailability: ['NEB'] },
  { id: 'sgrai', name: 'SgrAI', recognitionSequence: 'CRCCGGYG', forwardCutOffset: 2, reverseCutOffset: 6, enzymeClass: 'type_ii', category: 'rare_cutter', isCommon: false, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB'] },

  // ─── Diagnostic 4-Cutters ─────────────────────────────────────────────
  { id: 'dpni', name: 'DpnI', recognitionSequence: 'GATC', forwardCutOffset: 2, reverseCutOffset: 2, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher', 'Agilent'] },
  { id: 'haeiii', name: 'HaeIII', aliases: ['BsuRI', 'PalI'], recognitionSequence: 'GGCC', forwardCutOffset: 2, reverseCutOffset: 2, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'alui', name: 'AluI', recognitionSequence: 'AGCT', forwardCutOffset: 2, reverseCutOffset: 2, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'rsai', name: 'RsaI', aliases: ['AfaI'], recognitionSequence: 'GTAC', forwardCutOffset: 2, reverseCutOffset: 2, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: true, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'mspi', name: 'MspI', aliases: ['HpaII'], recognitionSequence: 'CCGG', forwardCutOffset: 1, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: true, overhangLength: 2, overhangPolarity: '5prime', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'hhai', name: 'HhaI', aliases: ['CfoI', 'Hin6I'], recognitionSequence: 'GCGC', forwardCutOffset: 3, reverseCutOffset: 1, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: true, overhangLength: 2, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'taqi', name: 'TaqI', aliases: ['TthHB8I'], recognitionSequence: 'TCGA', forwardCutOffset: 1, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: true, overhangLength: 2, overhangPolarity: '5prime', heatInactivationC: 'none', supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'sau3ai', name: 'Sau3AI', aliases: ['Bsp143I', 'MboI', 'DpnII'], recognitionSequence: 'GATC', forwardCutOffset: 0, reverseCutOffset: 4, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: true, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'msei', name: 'MseI', aliases: ['Tru9I', 'SaqAI'], recognitionSequence: 'TTAA', forwardCutOffset: 1, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: true, overhangLength: 2, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'bfai', name: 'BfaI', aliases: ['MaeI'], recognitionSequence: 'CTAG', forwardCutOffset: 1, reverseCutOffset: 3, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: false, overhangLength: 2, overhangPolarity: '5prime', heatInactivationC: 80, supplierAvailability: ['NEB'] },
  { id: 'ddei', name: 'DdeI', recognitionSequence: 'CTNAG', forwardCutOffset: 1, reverseCutOffset: 4, enzymeClass: 'type_ii', category: 'diagnostic_4cutter', isCommon: false, overhangLength: 3, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB'] },

  // ─── Type IIS & Multi-Part Assembly (Golden Gate / MoClo) ───────────────
  { id: 'bsai', name: 'BsaI', aliases: ['Eco31I'], recognitionSequence: 'GGTCTC', forwardCutOffset: 7, reverseCutOffset: 11, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 1, bottomCutOffset: 5, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'bsmbi', name: 'BsmBI', aliases: ['Esp3I'], recognitionSequence: 'CGTCTC', forwardCutOffset: 7, reverseCutOffset: 11, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 1, bottomCutOffset: 5, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 80, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'esp3i', name: 'Esp3I', aliases: ['BsmBI'], recognitionSequence: 'CGTCTC', forwardCutOffset: 7, reverseCutOffset: 11, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 1, bottomCutOffset: 5, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 80, supplierAvailability: ['ThermoFisher', 'NEB'] },
  { id: 'bbsi', name: 'BbsI', aliases: ['BpiI'], recognitionSequence: 'GAAGAC', forwardCutOffset: 8, reverseCutOffset: 12, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 2, bottomCutOffset: 6, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'paqci', name: 'PaqCI', aliases: ['AarI'], recognitionSequence: 'CACCTGC', forwardCutOffset: 11, reverseCutOffset: 15, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 4, bottomCutOffset: 8, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'aari', name: 'AarI', aliases: ['PaqCI'], recognitionSequence: 'CACCTGC', forwardCutOffset: 11, reverseCutOffset: 15, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 4, bottomCutOffset: 8, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['ThermoFisher', 'NEB'] },
  { id: 'sapi', name: 'SapI', aliases: ['BspQI'], recognitionSequence: 'GCTCTTC', forwardCutOffset: 8, reverseCutOffset: 11, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 1, bottomCutOffset: 4, overhangLength: 3, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'bspqi', name: 'BspQI', aliases: ['SapI'], recognitionSequence: 'GCTCTTC', forwardCutOffset: 8, reverseCutOffset: 11, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 1, bottomCutOffset: 4, overhangLength: 3, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'bseri', name: 'BseRI', recognitionSequence: 'GAGGAG', forwardCutOffset: 16, reverseCutOffset: 14, enzymeClass: 'type_iis', category: 'type_iis', isCommon: false, topCutOffset: 10, bottomCutOffset: 8, overhangLength: 2, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'bsgi', name: 'BsgI', recognitionSequence: 'GTGCAG', forwardCutOffset: 22, reverseCutOffset: 20, enzymeClass: 'type_iis', category: 'type_iis', isCommon: false, topCutOffset: 16, bottomCutOffset: 14, overhangLength: 2, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'bsmi', name: 'BsmI', aliases: ['Mva1269I'], recognitionSequence: 'GAATGC', forwardCutOffset: 7, reverseCutOffset: 5, enzymeClass: 'type_iis', category: 'type_iis', isCommon: false, topCutOffset: 1, bottomCutOffset: -1, overhangLength: 2, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'btgzi', name: 'BtgZI', recognitionSequence: 'GCGATG', forwardCutOffset: 16, reverseCutOffset: 20, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 10, bottomCutOffset: 14, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'foki', name: 'FokI', recognitionSequence: 'GGATG', forwardCutOffset: 14, reverseCutOffset: 18, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 9, bottomCutOffset: 13, overhangLength: 4, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'eari', name: 'EarI', aliases: ['Eam1104I', 'Ksp632I'], recognitionSequence: 'CTCTTC', forwardCutOffset: 7, reverseCutOffset: 10, enzymeClass: 'type_iis', category: 'type_iis', isCommon: true, topCutOffset: 1, bottomCutOffset: 4, overhangLength: 3, overhangPolarity: '5prime', heatInactivationC: 65, supplierAvailability: ['NEB', 'ThermoFisher'] },
  { id: 'hphi', name: 'HphI', recognitionSequence: 'GGTGA', forwardCutOffset: 13, reverseCutOffset: 12, enzymeClass: 'type_iis', category: 'type_iis', isCommon: false, topCutOffset: 8, bottomCutOffset: 7, overhangLength: 1, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'mlyi', name: 'MlyI', recognitionSequence: 'GAGTC', forwardCutOffset: 10, reverseCutOffset: 10, enzymeClass: 'type_iis', category: 'type_iis', isCommon: false, topCutOffset: 5, bottomCutOffset: 5, overhangLength: 0, overhangPolarity: 'blunt', heatInactivationC: 65, supplierAvailability: ['NEB'] },
  { id: 'mmei', name: 'MmeI', recognitionSequence: 'TCCRAC', forwardCutOffset: 26, reverseCutOffset: 24, enzymeClass: 'type_iis', category: 'type_iis', isCommon: false, topCutOffset: 20, bottomCutOffset: 18, overhangLength: 2, overhangPolarity: '3prime', heatInactivationC: 65, supplierAvailability: ['NEB'] }
] as const;

// ─── Fast Lookups & Indexing ─────────────────────────────────────────────

const ENZYME_MAP = new Map<string, RestrictionEnzyme>();
const ALIAS_MAP = new Map<string, RestrictionEnzyme>();

for (const enzyme of BUILTIN_ENZYMES) {
  ENZYME_MAP.set(enzyme.id.toLowerCase(), enzyme);
  ENZYME_MAP.set(enzyme.name.toLowerCase(), enzyme);
  if (enzyme.aliases) {
    for (const alias of enzyme.aliases) {
      ALIAS_MAP.set(alias.toLowerCase(), enzyme);
    }
  }
}

/**
 * Single canonical lookup helper for restriction enzymes across SeqCraft.
 * Normalizes input case-insensitively, resolves aliases/isoschizomers,
 * and returns the canonical enzyme definition with IUPAC capitalization.
 */
export function findEnzyme(nameOrId: string): RestrictionEnzyme | undefined {
  if (!nameOrId || typeof nameOrId !== 'string') return undefined;
  const query = nameOrId.trim().toLowerCase();
  return ENZYME_MAP.get(query) || ALIAS_MAP.get(query);
}

/**
 * Returns fuzzy / prefix suggestions for an unknown enzyme query.
 * Useful for agent and user error messages.
 */
export function getEnzymeSuggestions(query: string, maxSuggestions = 5): string[] {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toLowerCase();
  const qNorm = q
    .replace(/1$/, 'i')
    .replace(/2$/, 'ii')
    .replace(/3$/, 'iii')
    .replace(/4$/, 'iv')
    .replace(/5$/, 'v');

  const matches = new Set<string>();

  // 1. Exact match against normalized roman numeral or prefix
  for (const e of BUILTIN_ENZYMES) {
    const eLower = e.name.toLowerCase();
    const idLower = e.id.toLowerCase();
    if (eLower === qNorm || idLower === qNorm || eLower.startsWith(q) || idLower.startsWith(q)) {
      matches.add(e.name);
    }
    if (e.aliases) {
      for (const a of e.aliases) {
        if (a.toLowerCase() === qNorm || a.toLowerCase().startsWith(q)) {
          matches.add(`${e.name} (alias: ${a})`);
        }
      }
    }
    if (matches.size >= maxSuggestions) break;
  }

  // 2. Substring matching
  if (matches.size < maxSuggestions) {
    for (const e of BUILTIN_ENZYMES) {
      if ((e.name.toLowerCase().includes(q) || e.name.toLowerCase().includes(qNorm)) && !matches.has(e.name)) {
        matches.add(e.name);
      }
      if (matches.size >= maxSuggestions) break;
    }
  }

  // 3. Edit distance matching (Levenshtein distance <= 2)
  if (matches.size < maxSuggestions) {
    const candidates: Array<{ name: string; dist: number }> = [];
    for (const e of BUILTIN_ENZYMES) {
      if (matches.has(e.name)) continue;
      const dist = Math.min(
        levenshtein(q, e.name.toLowerCase()),
        levenshtein(qNorm, e.name.toLowerCase())
      );
      if (dist <= 2) {
        candidates.push({ name: e.name, dist });
      }
    }
    candidates.sort((a, b) => a.dist - b.dist);
    for (const c of candidates) {
      matches.add(c.name);
      if (matches.size >= maxSuggestions) break;
    }
  }

  return Array.from(matches).slice(0, maxSuggestions);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Returns all standard palindromic Type II restriction endonucleases. */
export function getStandardTypeIIEnzymes(): RestrictionEnzyme[] {
  return BUILTIN_ENZYMES.filter(e => e.enzymeClass === 'type_ii');
}

/** Returns all Type IIS restriction endonucleases used for Golden Gate assembly and domestication. */
export function getTypeIISEnzymes(): RestrictionEnzyme[] {
  return BUILTIN_ENZYMES.filter(e => e.enzymeClass === 'type_iis');
}

/** Returns commonly used cloning enzymes. */
export function getCommonCloningEnzymes(): RestrictionEnzyme[] {
  return BUILTIN_ENZYMES.filter(e => e.isCommon);
}

/** Returns rare 8-cutter restriction endonucleases. */
export function getRareCutters(): RestrictionEnzyme[] {
  return BUILTIN_ENZYMES.filter(e => e.category === 'rare_cutter');
}

/** Returns diagnostic 4-cutter restriction endonucleases. */
export function getDiagnostic4Cutters(): RestrictionEnzyme[] {
  return BUILTIN_ENZYMES.filter(e => e.category === 'diagnostic_4cutter');
}
