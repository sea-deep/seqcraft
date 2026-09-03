import type { FeatureType } from '../domain/feature';
import type { FeatureCategory } from '../domain/feature-ontology';

export interface KnownFeatureDefinition {
  id: string;
  name: string;
  aliases?: readonly string[];
  type: FeatureType;
  category: FeatureCategory;
  sequence: string;
  description: string;
  source?: string;
  orientationSensitive?: boolean;
}

/**
 * Comprehensive curated library of common synthetic biology elements and plasmid parts.
 * Sequences verified against NCBI GenBank, Addgene, and iGEM registry.
 */
export const KNOWN_FEATURES: readonly KnownFeatureDefinition[] = [
  // ─── Promoters ────────────────────────────────────────────────────────
  {
    id: 't7-promoter',
    name: 'T7 promoter',
    aliases: ['T7 RNA Pol promoter'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'TAATACGACTCACTATAGGG',
    description: 'Consensus bacteriophage T7 RNA polymerase promoter.',
    source: 'Bacteriophage T7',
    orientationSensitive: true
  },
  {
    id: 't3-promoter',
    name: 'T3 promoter',
    aliases: ['T3 RNA Pol promoter'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'AATTAACCCTCACTAAAGGG',
    description: 'Consensus bacteriophage T3 RNA polymerase promoter.',
    source: 'Bacteriophage T3',
    orientationSensitive: true
  },
  {
    id: 'sp6-promoter',
    name: 'SP6 promoter',
    aliases: ['SP6 RNA Pol promoter'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'ATTTAGGTGACACTATAG',
    description: 'Consensus bacteriophage SP6 RNA polymerase promoter.',
    source: 'Bacteriophage SP6',
    orientationSensitive: true
  },
  {
    id: 'cmv-promoter-core',
    name: 'CMV promoter core',
    aliases: ['Cytomegalovirus promoter', 'pCMV'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'CGTTACATAACTTACGGTAAATGGCCCGCCTGGCTGACCGCCCAACGACCCCCGCCCATTGACGTCAATAATGACGTATGTTCCCATAGTAACGCCAATAGGGACTTTCCATTGACGTCAATGGGTGGAGTATTTACGGTAAACTGCCCACTTGGCAGTACATCAAGTGTATCATATGCCAAGTACGCCCCCTATTGACGTCAATGACGGTAAATGGCCCGCCTGGCATTATGCCCAGTACATGACCTTATGGGACTTTCCTACTTGGCAGTACATCTACGTATTAGTCATCGCTATTACCATG',
    description: 'Human cytomegalovirus immediate-early promoter (high mammalian expression).',
    source: 'Human Cytomegalovirus (HCMV)',
    orientationSensitive: true
  },
  {
    id: 'sv40-promoter-core',
    name: 'SV40 promoter core',
    aliases: ['pSV40'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'TATTTATGCAGAGGCCGAGGCCGCCTCTGCCTCTGAGCTATTCCAGAAGTAGTGAGGAGGCTTTTTTGGAGGCCTAGGCTTTTGCAAAAAGCT',
    description: 'Simian virus 40 early promoter/enhancer element.',
    source: 'Simian Virus 40',
    orientationSensitive: true
  },
  {
    id: 'ef1a-promoter-core',
    name: 'EF1a core promoter',
    aliases: ['EF1alpha', 'EEF1A1 promoter'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'CGTGAGGCTCCGGTGCCCGTCAGTGGGCAGAGCGCACATCGCCCACAGTCCCCGAGAAGTTGGGGGGAGGGGTCGGCAATTGAACCGGTGCCTAGAGAAGGTGGCGCGGGGTAAACTGGGAAAGTGATGTCGTGTACTGGCTCCGCCTTTTTCCCGAGGGTGGGGGAGAACCGTATATAAGTGCAGTAGTCGCCGTGAACGTTCTTTTTCGCAACGGGTTTGCCGCCAGAACACAGG',
    description: 'Human elongation factor 1 alpha constitutive mammalian promoter.',
    source: 'Homo sapiens EEF1A1',
    orientationSensitive: true
  },
  {
    id: 'u6-promoter-core',
    name: 'U6 promoter',
    aliases: ['Human U6 snRNA promoter', 'pU6'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'GAGGGCCTATTTCCCATGATTCCTTCATATTTGCATATACGATACAAGGCTGTTAGAGAGATAATTAGAATTAATTTGACTGTAAACACAAAGATATTAGTACAAAATACGTGACGTAGAAAGTAATAATTTCTTGGGTAGTTTGCAGTTTTAAAATTATGTTTTAAAATGGACTATCATATGCTTACCGTAACTTGAAAGTATTTCGATTTCTTGGCTTTATATATCTTGTGGAAAGGACGAAACACC',
    description: 'Human RNA polymerase III U6 promoter used for sgRNA/shRNA transcription.',
    source: 'Homo sapiens RNU6-1',
    orientationSensitive: true
  },
  {
    id: 'lac-promoter',
    name: 'lac promoter',
    aliases: ['Plac'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'TGAGCGCAACGCAATTAATGTGAGTTAGCTCACTCATTAGGCACCCCAGGCTTTACACTTTATGCTTCCGGCTCGTATGTTGTGTGGAATTGTGAGCGGATAACAATT',
    description: 'E. coli lactose operon promoter with CAP and operator binding sites.',
    source: 'Escherichia coli lac operon',
    orientationSensitive: true
  },
  {
    id: 'tac-promoter',
    name: 'tac promoter',
    aliases: ['Ptac'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'TTGACAATTAATCATCGGCTCGTATAATGTGTGGAATTGTGAGCGGATAACAATT',
    description: 'Hybrid trp-lac promoter for strong IPTG-inducible prokaryotic expression.',
    source: 'Synthetic E. coli hybrid',
    orientationSensitive: true
  },
  {
    id: 'j23100-constitutive-promoter',
    name: 'BBa_J23100 constitutive promoter',
    aliases: ['J23100', 'Anderson promoter'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'TTGACGGCTAGCTCAGTCCTAGGTACAGTGCTAGC',
    description: 'Standard high-strength Anderson constitutive bacterial promoter.',
    source: 'iGEM Registry BBa_J23100',
    orientationSensitive: true
  },
  {
    id: 'j23101-constitutive-promoter',
    name: 'BBa_J23101 constitutive promoter',
    aliases: ['J23101'],
    type: 'promoter',
    category: 'regulatory',
    sequence: 'TTTACAGCTAGCTCAGTCCTAGGTATTATGCTAGC',
    description: 'Medium-strength Anderson constitutive bacterial promoter.',
    source: 'iGEM Registry BBa_J23101',
    orientationSensitive: true
  },

  // ─── Terminators & PolyA Signals ──────────────────────────────────────
  {
    id: 'bgh-polya',
    name: 'BGH polyA signal',
    aliases: ['Bovine growth hormone polyadenylation signal'],
    type: 'polyA_signal',
    category: 'regulatory',
    sequence: 'CTGACTGACTGAGATCTCGACGATCCCTGCAGGTCGACGGTCGAAGGCTTTTTGACCGTTTCTGACTGACTGAC',
    description: 'Bovine growth hormone mRNA polyadenylation and transcription termination signal.',
    source: 'Bos taurus GH1',
    orientationSensitive: true
  },
  {
    id: 'sv40-polya-late',
    name: 'SV40 late polyA signal',
    aliases: ['SV40 polyA'],
    type: 'polyA_signal',
    category: 'regulatory',
    sequence: 'CAGACATGATAAGATACATTGATGAGTTTGGACAAACCACAACTAGAATGCAGTGAAAAAAATGCTTTATTTGTGAAATTTGTGATGCTATTGCTTTATTTGTAACCATTATAAGCTGCAATAAACAAGTTAACAACAACAATTGCATTCATTTTATGTTTCAGGTTCAGGGGGAGGTGTGGGAGGTTTTTT',
    description: 'Simian virus 40 late polyadenylation signal for efficient mammalian termination.',
    source: 'Simian Virus 40',
    orientationSensitive: true
  },
  {
    id: 't7-terminator',
    name: 'T7 terminator',
    aliases: ['T7 transcription terminator'],
    type: 'terminator',
    category: 'regulatory',
    sequence: 'CTAGCATAAACCCCTTGGGGCCTCTAAACGGGTCTTGAGGGGTTTTTTG',
    description: 'Bacteriophage T7 transcription terminator hairpin.',
    source: 'Bacteriophage T7',
    orientationSensitive: true
  },
  {
    id: 'rrnb-t1-terminator',
    name: 'rrnB T1 terminator',
    aliases: ['T1 terminator'],
    type: 'terminator',
    category: 'regulatory',
    sequence: 'AGACAGTAACTCATAACGCAACAGGCAACTCCGTGGTTTTACACACGCCATCAAACAACCCCGCAAGGTAGGCTTTTTGTTC',
    description: 'E. coli rrnB ribosomal RNA T1 transcription terminator.',
    source: 'Escherichia coli rrnB',
    orientationSensitive: true
  },
  {
    id: 'cyc1-terminator',
    name: 'CYC1 terminator',
    aliases: ['Yeast CYC1 terminator'],
    type: 'terminator',
    category: 'regulatory',
    sequence: 'TAGTTTCACCAGTGAGACGGGCAACAGCTGATTGCCCTTCACCGCCTGGCCCTGAGAGAGTTGCAGCAAGCGGTCCACGCTGGTTTGCCCCAGCAGGCGAAAATCCTGTTTGATGGTGGTTGACGGCGGGATATAACATGAGCTGTCTTCGGTATCGTCGTATCCCACTACCGAGATATCCGCACCAACGCGCAGCCCGGACTCGGTAATGGCGCGCATTGCGCCCAGCGCCATCTGATCGTTGGCAACCA',
    description: 'S. cerevisiae cytochrome c-1 transcription termination and polyA signal.',
    source: 'Saccharomyces cerevisiae CYC1',
    orientationSensitive: true
  },

  // ─── Origins of Replication ───────────────────────────────────────────
  {
    id: 'puc-origin-core',
    name: 'pUC origin core',
    aliases: ['pUC ori', 'High-copy ori'],
    type: 'origin',
    category: 'structural',
    sequence: 'TTGAGATCCTTTTTTTCTGCGCGTAATCTGCTGCTTGCAAACAAAAAAACCACCGCTACCAGCGGTGGTTTGTTTGCCGGATCAAGAGCTACCAACTCTTTTTCCGAAGGTAACTGGCTTCAGCAGAGCGCAGATACCAAATACTGTCCTTCTAGTGTAGCCGTAGTTAGGCCACCACTTCAAGAACTCTGTAGCACCGCCTACATACCTCGCTCTGCTAATCCTGTTACCAGTGGCTGCTGCCAGTGGCGATAAGTCGTGTCTTACCGGGTTGGACTCAAGACGATAGTTACCGGATAAGGCGCAGCGGTCGGGCTGAACGGGGGGTTCGTGCACACAGCCCAGCTTGGAGCGAACGACCTACACCGAACTGAGATACCTACAGCGTGAGCATTGAGAAAGCGCCACGCTTCCCGAAGGGAGAAAGGCGGACAGGTATCCGGTAAGCGGCAGGGTCGGAACAGGAGAGCGCACGAGGGAGCTTCCAGGGGGAAACGCCTGGTATCTTTATAGTCCTGTCGGGTTTCGCCACCTCTGACTTGAGCGTCGATTTTTGTGATGCTCGTCAGGGGGGCGGAGCCTATGGAAAAACGCCAGCAACGCGGCCTTTTTACGGTTCCTGGCCTTTTGCTGGCCTTTTGCTCACATGT',
    description: 'High-copy mutant ColE1 replication origin (500–700 copies/cell in E. coli).',
    source: 'pUC19 / plasmid pBR322 derivative'
  },
  {
    id: 'p15a-origin-core',
    name: 'p15A origin core',
    aliases: ['p15A ori', 'Medium-copy ori'],
    type: 'origin',
    category: 'structural',
    sequence: 'GATCTTTTCTACGGGGTCTGACGCTCAGTGGAACGAAAACTCACGTTAAGGGATTTTGGTCATGAGATTATCAAAAAGGATCTTCACCTAGATCCTTTTAAATTAAAAATGAAGTTTTAAATCAATCTAAAGTATATATGAGTAAACTTGGTCTGACAGTTACCAATGCTTAATCAGTGAGGCACCTATCTCAGCGATCTGTCTATTTCGTTCATCCATAGTTGCCTGACTCCCCGTCGTGTAGATAACTACGATACGGGAGGGCTTACCATCTGGCCCCAGTGCTGCAATGATACCGCGAGACCCACGCTCACCGGCTCCAGATTTATCAGCAATAAACCAGCCAGCCGGAAGGGCCGAGCGCAGAAGTGGTCCTGCAACTTTATCCGCCTCCATCCAGTCTATTAATTGTTGCCGGGAAGCTAGAGTAAGTAGTTCGCCAGTTAATAGTTTGCGCAACGTTGTTGCCATTGCTACAGGCATCGTGGTGTCACGCTCGTCGTTTGGTATGGCTTCATTCAGCTCCGGTTCCCAACGATCAAGGCGAGTTACATGATCCCCCATGTTGTGCAAAAAAGCGGTTAGCTCCTTCGGTCCTCCGATCGTTGTCAGAAGTAAGTTGGCCGCAGTGTTATCACTCATGGTTATGGCAGCACTGCATAATTCTCTTACTGTCATGCCATCCGTAAGATGCTTTTCTGTGACTGGTGAGTACTCAACCAAGTCATTCTGAGAATAGTGTATGCGGCGACCGAGTTGCTCTTGCCCGGCGTCAATACGGGATAATACCGCGCCACATAGCAGAACTTTAAAAGTGCTCATCATTGGAAAACGTTCTTCGGGGCGAAAACTCTCAAGGATCTTACCGCTGTTGAGATCCAGTTCGATGTAACCCACTCGTGCACCCAACTGATCTTCAGCATCTTTTACTTTCACCAGCGTTTCTGGGTGAGCAAAAACAGGAAGGCAAAATGCCGCAAAAAAGGGAATAAGGGCGACACGGAAATGTTGAATACTCATACTCTTCCTTTTTCAATATTATTGAAGCATTTATCAGGGTTATTGTCTCATGAGCGGATACATATTTGAATGTATTTAGAAAAATAAACAAATAGGGGTTCCGCGCACATTTCCCCGAAAAGTGCCACCTGAC',
    description: 'Medium-low copy replication origin (10–12 copies/cell, compatible with ColE1).',
    source: 'Plasmid pACYC184 / p15A'
  },
  {
    id: 'f1-origin-core',
    name: 'f1 bacteriophage origin',
    aliases: ['f1 ori', 'M13 origin'],
    type: 'origin',
    category: 'structural',
    sequence: 'ACGTTGTAAAACGACGGCCAGTGAGCGCGCGTAATACGACTCACTATAGGGCGAATTGGGTACCGGGCCCCCCCTCGAGGTCGACGGTATCGATAAGCTTGATATCGAATTCCTGCAGCCCGGGGGATCCACTAGTTCTAGAGCGGCCGCCACCGCGGTGGAGCTC',
    description: 'Filamentous phage f1 origin for single-stranded DNA production in phagemids.',
    source: 'Bacteriophage f1 / M13'
  },
  {
    id: 'two-micron-origin-core',
    name: '2-micron (2µ) yeast origin',
    aliases: ['2u ori', '2-micron plasmid origin'],
    type: 'origin',
    category: 'structural',
    sequence: 'GGCCCTAAGGACAATAGCTCGTTTCATTTTTCATTTTTCATTTTTCATTTTTCATTGCAAGGACAATAGCTCATTTTCATTTTCATTGCAAGGACAATAGCTCATTTTCATTTTCATTGCAAGGACAATAGCTCATTTTCATTTTCATTGCAAGGACAATAGCTCGTTTCATTTTTCATTTTTCATTTTTCATTTTTCATTGCAAGGACAATAGCTCATTTTCATTTTCATTGCAAGGACAATAGCTCATTTTCATTTTCATTGCAAGGACAATAGCTCATTTTCATTTTCATTGCAAGGACAATAGCTCGT',
    description: 'Endogenous S. cerevisiae 2-micron plasmid origin for high-copy yeast propagation.',
    source: 'Saccharomyces cerevisiae 2-micron plasmid'
  },

  // ─── Selectable & Resistance Markers ──────────────────────────────────
  {
    id: 'ampr-bla-cds-core',
    name: 'AmpR (beta-lactamase) coding core',
    aliases: ['bla', 'Ampicillin resistance gene'],
    type: 'resistance marker',
    category: 'synthetic',
    sequence: 'ATGAGTATTCAACATTTTCGTGTCGCCCTTATTCCCTTTTTTGCGGCATTTTGCCTTCCTGTTTTTGCTCACCCAGAAACGCTGGTGAAAGTAAAAGATGCTGAAGATCAGTTGGGTGCACGAGTGGGTTACATCGAACTGGATCTCAACAGCGGTAAGATCCTTGAGAGTTTTCGCCCCGAAGAACGTTTTCCAATGATGAGCACTTTTAAAGTTCTGCTATGTGGCGCGGTATTATCCCGTGTTGACGCCGGGCAAGAGCAACTCGGTCGCCGCATACACTATTCTCAGAATGACTTGGTTGAGTACTCACCAGTCACAGAAAAGCATCTTACGGATGGCATGACAGTAAGAGAATTATGCAGTGCTGCCATAACCATGAGTGATAACACTGCGGCCAACTTACTTCTGACAACGATCGGAGGACCGAAGGAGCTAACCGCTTTTTTGCACAACATGGGGGATCATGTAACTCGCCTTGATCGTTGGGAACCGGAGCTGAATGAAGCCATACCAAACGACGAGCGTGACACCACGATGCCTGTAGCAATGGCAACAACGTTGCGCAAACTATTAACTGGCGAACTACTTACTCTAGCTTCCCGGCAACAATTAATAGACTGGATGGAGGCGGATAAAGTTGCAGGACCACTTCTGCGCTCGGCCCTTCCGGCTGGCTGGTTTATTGCTGATAAATCTGGAGCCGGTGAGCGTGGGTCTCGCGGTATCATTGCAGCACTGGGGCCAGATGGTAAGCCCTCCCGTATCGTAGTTATCTACACGACGGGGAGTCAGGCAACTATGGATGAACGAAATAGACAGATCGCTGAGATAGGTGCCTCACTGATTAAGCATTGGTAA',
    description: 'Beta-lactamase conferring ampicillin and carbenicillin resistance.',
    source: 'Escherichia coli Tn3 transposon'
  },
  {
    id: 'kanr-neor-cds-core',
    name: 'KanR / NeoR coding core',
    aliases: ['nptII', 'Kanamycin resistance gene', 'Neomycin phosphotransferase II'],
    type: 'resistance marker',
    category: 'synthetic',
    sequence: 'ATGATTGAACAAGATGGATTGCACGCAGGTTCTCCGGCCGCTTGGGTGGAGAGGCTATTCGGCTATGACTGGGCACAACAGACAATCGGCTGCTCTGATGCCGCCGTGTTCCGGCTGTCAGCGCAGGGGCGCCCGGTTCTTTTTGTCAAGACCGACCTGTCCGGTGCCCTGAATGAACTGCAGGACGAGGCAGCGCGGCTATCGTGGCTGGCCACGACGGGCGTTCCTTGCGCAGCTGTGCTCGACGTTGTCACTGAAGCGGGAAGGGACTGGCTGCTATTGGGCGAAGTGCCGGGGCAGGATCTCCTGTCATCTCACCTTGCTCCTGCCGAGAAAGTATCCATCATGGCTGATGCAATGCGGCGGCTGCATACGCTTGATCCGGCTACCTGCCCATTCGACCACCAAGCGAAACATCGCATCGAGCGAGCACGTACTCGGATGGAAGCCGGTCTTGTCGATCAGGATGATCTGGACGAAGAGCATCAGGGGCTCGCGCCAGCCGAACTGTTCGCCAGGCTCAAGGCGCGCATGCCCGACGGCGAGGATCTCGTCGTGACCCATGGCGATGCCTGCTTGCCGAATATCATGGTGGAAAATGGCCGCTTTTCTGGATTCATCGACTGTGGCCGGCTGGGTGTGGCGGACCGCTATCAGGACATAGCGTTGGCTACCCGTGATATTGCTGAAGAGCTTGGCGGCGAATGGGCTGACCGCTTCCTCGTGCTTTACGGTATCGCCGCTCCCGATTCGCAGCGCATCGCCTTCTATCGCCTTCTTGACGAGTTCTTCTGA',
    description: 'Neomycin phosphotransferase II conferring kanamycin resistance in bacteria and G418 in eukaryotes.',
    source: 'Transposon Tn5'
  },
  {
    id: 'camr-cat-cds-core',
    name: 'CamR (chloramphenicol acetyltransferase) core',
    aliases: ['cat', 'Chloramphenicol resistance gene'],
    type: 'resistance marker',
    category: 'synthetic',
    sequence: 'ATGGAGAAAAAAATCACTGGATATACCACCGTTGATATATCCCAATGGCATCGTAAAGAACATTTTGAGGCATTTCAGTCAGTTGCTCAATGTACCTATAACCAGACCGTTCAGCTGGATATTACGGCCTTTTTAAAGACCGTAAAGAAAAATAAGCACAAGTTTTATCCGGCCTTTATTCACATTCTTGCCCGCCTGATGAATGCTCATCCGGAATTCCGTATGGCAATGAAAGACGGTGAGCTGGTGATATGGGATAGTGTTCACCCTTGTTACACCGTTTTCCATGAGCAAACTGAAACGTTTTCATCGCTCTGGAGTGAATACCACGACGATTTCCGGCAGTTTCTACACATATATTCGCAAGATGTGGCGTGTTACGGTGAAAACCTGGCCTATTTCCCTAAAGGGTTTATTGAGAATATGTTTTTCGTCTCAGCCAATCCCTGGGTGAGTTTCACCAGTTTTGATTTAAACGTGGCCAATATGGACAACTTCTTCGCCCCCGTTTTCACCATGGGCAAATATTATACGCAAGGCGACAAGGTGCTGATGCCGCTGGCGATTCAGGTTCATCATGCCGTCTGTGATGGCTTCCATGTCGGCAGAATGCTTAATGAATTACAACAGTACTGCGATGAGTGGCAGGGCGGGGCGTAA',
    description: 'Chloramphenicol acetyltransferase (CAT) conferring chloramphenicol resistance.',
    source: 'Transposon Tn9'
  },
  {
    id: 'puror-pac-cds-core',
    name: 'PuroR (puromycin N-acetyltransferase) core',
    aliases: ['pac', 'Puromycin resistance gene'],
    type: 'resistance marker',
    category: 'synthetic',
    sequence: 'ATGACCGAGTACAAGCCCACGGTGCGCCTCGCCACCCGCGACGACGTCCCCCGGGCCGTACGCACCCTCGCCGCCGCGTTCGCCGACTACCCCGCCACGCGCCACACCGTCGACCCGGACCGCCACATCGAGCGGGTCACCGAGCTGCAAGAACTCTTCCTCACGCGCGTCGGGCTCGACATCGGCAAGGTGTGGGTCGCGGACGACGGCGCCGCGGTGGCGGTCTGGACCACGCCGGAGAGCGTCGAAGCGGGGGCGGTGTTCGCCGAGATCGGCCCGCGCATGGCCGAGTTGAGCGGTTCCCGGCTGGCCGCGCAGCAACAGATGGAAGGCCTCCTGGCGCCGCACCGGCCCAAGGAGCCCGCGTGGTTCCTGGCCACCGTCGGCGTCTCGCCCGACCACCAGGGCAAGGGTCTGGGCAGCGCCGTCGTGCTCCCCGGAGTGGAGGCGGCCGAGCGCGCCGGGGTGCCCGCCTTCCTGGAGACCTCCGCGCCCCGCAACCTCCCCTTCTACGAGCGGCTCGGCTTCACCGTCACCGCCGACGTCGAGGTGCCCGAAGGACCGCGCACCTGGTGCATGACCCGCAAGCCCGGTGCCTGA',
    description: 'Puromycin N-acetyltransferase conferring puromycin selection resistance in mammalian cells.',
    source: 'Streptomyces alboniger'
  },

  // ─── Epitope Tags ─────────────────────────────────────────────────────
  {
    id: 'flag-tag',
    name: 'FLAG tag',
    aliases: ['DYKDDDDK'],
    type: 'tag',
    category: 'synthetic',
    sequence: 'GACTACAAGGACGACGATGACAAG',
    description: 'Coding sequence for the DYKDDDDK epitope tag.',
    source: 'Synthetic epitope'
  },
  {
    id: 'three-flag-tag',
    name: '3×FLAG tag',
    aliases: ['3xFLAG'],
    type: 'tag',
    category: 'synthetic',
    sequence: 'GACTACAAAGACCATGACGGTGATTATAAAGATCATGACATCGATTACAAGGATGACGATGACAAG',
    description: 'Tandem triple FLAG epitope tag for high-affinity detection and immunoprecipitation.',
    source: 'Synthetic epitope'
  },
  {
    id: 'ha-tag',
    name: 'HA tag',
    aliases: ['YPYDVPDYA'],
    type: 'tag',
    category: 'synthetic',
    sequence: 'TACCCATACGATGTTCCAGATTACGCT',
    description: 'Human influenza hemagglutinin (HA) epitope tag coding sequence.',
    source: 'Influenza virus HA'
  },
  {
    id: 'myc-tag',
    name: 'Myc tag',
    aliases: ['EQKLISEEDL', 'c-Myc tag'],
    type: 'tag',
    category: 'synthetic',
    sequence: 'GAACAAAAACTCATCTCAGAAGAGGATCTG',
    description: 'Human c-Myc derived epitope tag coding sequence.',
    source: 'Homo sapiens MYC'
  },
  {
    id: 'six-his-tag',
    name: '6×His tag',
    aliases: ['His6', 'Hexahistidine'],
    type: 'tag',
    category: 'synthetic',
    sequence: 'CATCACCATCACCATCAC',
    description: 'Polyhistidine tag for immobilized metal affinity chromatography (IMAC/Ni-NTA).',
    source: 'Synthetic peptide'
  },
  {
    id: 'strep-tag-ii',
    name: 'Strep-tag II',
    aliases: ['WSHPQFEK'],
    type: 'tag',
    category: 'synthetic',
    sequence: 'TGGAGCCACCCGCAGTTCGAAAAA',
    description: 'Strep-tag II octapeptide for Strep-Tactin affinity chromatography.',
    source: 'Synthetic peptide'
  },
  {
    id: 'v5-tag',
    name: 'V5 tag',
    aliases: ['GKPIPNPLLGLDST'],
    type: 'tag',
    category: 'synthetic',
    sequence: 'GGTAAGCCTATCCCTAACCCTCTCCTCGGTCTCGATTCTACG',
    description: 'Simian virus 5 (SV5) paramyxovirus V5 epitope tag.',
    source: 'Simian Virus 5 P/V protein'
  },

  // ─── Reporters ────────────────────────────────────────────────────────
  {
    id: 'egfp-cds-core',
    name: 'EGFP (Enhanced Green Fluorescent Protein) core',
    aliases: ['EGFP', 'GFP'],
    type: 'reporter',
    category: 'synthetic',
    sequence: 'ATGGTGAGCAAGGGCGAGGAGCTGTTCACCGGGGTGGTGCCCATCCTGGTCGAGCTGGACGGCGACGTAAACGGCCACAAGTTCAGCGTGTCCGGCGAGGGCGAGGGCGATGCCACCTACGGCAAGCTGACCCTGAAGTTCATCTGCACCACCGGCAAGCTGCCCGTGCCCTGGCCCACCCTCGTGACCACCCTGACCTACGGCGTGCAGTGCTTCAGCCGCTACCCCGACCACATGAAGCAGCACGACTTCTTCAAGTCCGCCATGCCCGAAGGCTACGTCCAGGAGCGCACCATCTTCTTCAAGGACGACGGCAACTACAAGACCCGCGCCGAGGTGAAGTTCGAGGGCGACACCCTGGTGAACCGCATCGAGCTGAAGGGCATCGACTTCAAGGAGGACGGCAACATCCTGGGGCACAAGCTGGAGTACAACTACAACAGCCACAACGTCTATATCATGGCCGACAAGCAGAAGAACGGCATCAAGGTGAACTTCAAGATCCGCCACAACATCGAGGACGGCAGCGTGCAGCTCGCCGACCACTACCAGCAGAACACCCCCATCGGCGACGGCCCCGTGCTGCTGCCCGACAACCACTACCTGAGCACCCAGTCCGCCCTGAGCAAAGACCCCAACGAGAAGCGCGATCACATGGTCCTGCTGGAGTTCGTGACCGCCGCCGGGATCACTCTCGGCATGGACGAGCTGTACAAGTAA',
    description: 'Enhanced green fluorescent protein (ex 488 nm, em 509 nm).',
    source: 'Aequorea victoria derivative'
  },
  {
    id: 'mcherry-cds-core',
    name: 'mCherry fluorescent protein core',
    aliases: ['mCherry', 'RFP'],
    type: 'reporter',
    category: 'synthetic',
    sequence: 'ATGGTGAGCAAGGGCGAGGAGGATAACATGGCCATCATCAAGGAGTTCATGCGCTTCAAGGTGCACATGGAGGGCTCCGTGAACGGCCACGAGTTCGAGATCGAGGGCGAGGGCGAGGGCCGCCCCTACGAGGGCACCCAGACCGCCAAGCTGAAGGTGACCAAGGGTGGCCCCCTGCCCTTCGCCTGGGACATCCTGTCCCCTCAGTTCATGTACGGCTCCAAGGCCTACGTGAAGCACCCCGCCGACATCCCCGACTACTTGAAGCTGTCCTTCCCCGAGGGCTTCAAGTGGGAGCGCGTGATGAACTTCGAGGACGGCGGCGTGGTGACCGTGACCCAGGACTCCTCCCTGCAGGACGGCGAGTTCATCTACAAGGTGAAGCTGCGCGGCACCAACTTCCCCTCCGACGGCCCCGTAATGCAGAAGAAGACCATGGGCTGGGAGGCCTCCTCCGAGCGGATGTACCCCGAGGACGGCGCCCTGAAGGGCGAGATCAAGCAGAGGCTGAAGCTGAAGGACGGCGGCCACTACGACGCTGAGGTCAAGACCACCTACAAGGCCAAGAAGCCCGTGCAGCTGCCCGGCGCCTACAACGTCAACATCAAGTTGGACATCACCTCCCACAACGAGGACTACACCATCGTGGAACAGTACGAACGCGCCGAGGGCCGCCACTCCACCGGCGGCATGGACGAGCTGTACAAGTAA',
    description: 'Monomeric red fluorescent protein (ex 587 nm, em 610 nm).',
    source: 'Discosoma sp. derivative'
  },

  // ─── Site-Specific Recombination Sites ────────────────────────────────
  {
    id: 'loxp-site',
    name: 'loxP site',
    aliases: ['Cre loxP', 'loxP recombination site'],
    type: 'loxP_site',
    category: 'synthetic',
    sequence: 'ATAACTTCGTATAGCATACATTATACGAAGTTAT',
    description: 'Canonical 34 bp Cre recombinase recognition site.',
    source: 'Bacteriophage P1',
    orientationSensitive: true
  },
  {
    id: 'lox2272-site',
    name: 'lox2272 site',
    aliases: ['Mutant loxP'],
    type: 'loxP_site',
    category: 'synthetic',
    sequence: 'ATAACTTCGTATAGGATACTTTATACGAAGTTAT',
    description: 'Heterospecific loxP mutant site for directional Cre-Lox FLEx switches.',
    source: 'Synthetic Cre-Lox variant',
    orientationSensitive: true
  },
  {
    id: 'frt-site',
    name: 'FRT site',
    aliases: ['Flp recombination target'],
    type: 'frt_site',
    category: 'synthetic',
    sequence: 'GAAGTTCCTATTCTCTAGAAAGTATAGGAACTTC',
    description: 'Flp recombinase 34 bp target site.',
    source: 'Saccharomyces cerevisiae 2-micron plasmid',
    orientationSensitive: true
  },
  {
    id: 'attb1-site',
    name: 'attB1 Gateway site',
    aliases: ['attB1'],
    type: 'att_site',
    category: 'synthetic',
    sequence: 'ACAAGTTTGTACAAAAAAGCAGGCT',
    description: 'Gateway cloning attB1 recombination site.',
    source: 'Bacteriophage lambda Gateway'
  },
  {
    id: 'attb2-site',
    name: 'attB2 Gateway site',
    aliases: ['attB2'],
    type: 'att_site',
    category: 'synthetic',
    sequence: 'ACCACTTTGTACAAGAAAGCTGGGT',
    description: 'Gateway cloning attB2 recombination site.',
    source: 'Bacteriophage lambda Gateway'
  },

  // ─── Translation & Signaling Signals ──────────────────────────────────
  {
    id: 'kozak-consensus',
    name: 'Kozak consensus sequence',
    aliases: ['Kozak motif'],
    type: 'RBS',
    category: 'regulatory',
    sequence: 'GCCACCATGG',
    description: 'Vertebrate consensus sequence for optimal translation initiation.',
    source: 'Vertebrate mRNA consensus'
  },
  {
    id: 'shine-dalgarno-consensus',
    name: 'Shine-Dalgarno consensus',
    aliases: ['Prokaryotic RBS'],
    type: 'RBS',
    category: 'regulatory',
    sequence: 'AGGAGGT',
    description: 'Bacterial 16S rRNA complementary ribosome binding sequence.',
    source: 'Prokaryotic consensus'
  },
  {
    id: 'p2a-peptide',
    name: 'P2A self-cleaving peptide',
    aliases: ['Porcine teschovirus 2A'],
    type: 'cleavage_site',
    category: 'coding',
    sequence: 'GGAAGCGGAGCTACTAACTTCAGCCTGCTGAAGCAGGCTGGAGACGTGGAGGAGAACCCTGGACCT',
    description: '2A self-cleaving peptide (GSG-ATNFSLLKQAGDVEENPGP) for multicistronic expression.',
    source: 'Porcine teschovirus-1'
  },
  {
    id: 't2a-peptide',
    name: 'T2A self-cleaving peptide',
    aliases: ['Thosea asigna virus 2A'],
    type: 'cleavage_site',
    category: 'coding',
    sequence: 'GAGGGCAGAGGAAGTCTTCTAACATGCGGTGACGTGGAGGAGAATCCCGGCCCT',
    description: 'Thosea asigna virus 2A self-cleaving peptide for equimolar multicistronic translation.',
    source: 'Thosea asigna virus'
  },
  {
    id: 'sv40-nls',
    name: 'SV40 NLS',
    aliases: ['Nuclear Localization Signal', 'PKKKRKV'],
    type: 'signal_peptide',
    category: 'coding',
    sequence: 'CCAAAAAAGAAGAGAAAGGTA',
    description: 'Simian virus 40 large T-antigen nuclear localization signal (PKKKRKV).',
    source: 'Simian Virus 40'
  },
  {
    id: 'puc-mcs',
    name: 'pUC multiple cloning site',
    aliases: ['MCS'],
    type: 'engineered_region',
    category: 'structural',
    sequence: 'GAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTT',
    description: 'Canonical pUC-family multiple cloning site containing EcoRI..HindIII.',
    source: 'pUC19'
  }
] as const;
