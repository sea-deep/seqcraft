/**
 * Canonical biological feature ontology and semantic categorization for SeqCraft.
 * Adheres to INSDC / GenBank / SnapGene / Benchling conventions.
 */

export const FEATURE_CATEGORIES = [
  'coding',
  'regulatory',
  'rna',
  'structural',
  'binding',
  'synthetic',
  'general'
] as const;

export type FeatureCategory = typeof FEATURE_CATEGORIES[number];

export interface FeatureTypeMetadata {
  id: string;
  label: string;
  category: FeatureCategory;
  description: string;
  genbankKey: string;
  aliases?: readonly string[];
}

export const FEATURE_DEFINITIONS = [
  // ─── Coding & Expression ───────────────────────────────────────────────
  { id: 'CDS', label: 'Coding Sequence (CDS)', category: 'coding', genbankKey: 'CDS', description: 'Protein-coding sequence spanning start to stop codon.' },
  { id: 'gene', label: 'Gene', category: 'coding', genbankKey: 'gene', description: 'Genomic or full transcriptional gene locus.' },
  { id: 'exon', label: 'Exon', category: 'coding', genbankKey: 'exon', description: 'Expressed region retained after RNA splicing.' },
  { id: 'intron', label: 'Intron', category: 'coding', genbankKey: 'intron', description: 'Non-coding intervening sequence spliced out from pre-mRNA.' },
  { id: 'signal_peptide', label: 'Signal Peptide', category: 'coding', genbankKey: 'sig_peptide', aliases: ['sig_peptide', 'signal_seq'], description: 'N-terminal peptide directing protein secretion or localization.' },
  { id: 'transit_peptide', label: 'Transit Peptide', category: 'coding', genbankKey: 'transit_peptide', description: 'N-terminal transit sequence targeting organelles.' },
  { id: 'cleavage_site', label: 'Proteolytic Cleavage Site', category: 'coding', genbankKey: 'misc_feature', aliases: ['protease_site'], description: 'Specific peptide cleavage recognition site (e.g. TEV, PreScission, 2A).' },

  // ─── Regulatory & Signals ───────────────────────────────────────────────
  { id: 'promoter', label: 'Promoter', category: 'regulatory', genbankKey: 'promoter', description: 'DNA region initiating transcription by RNA polymerase.' },
  { id: 'terminator', label: 'Terminator', category: 'regulatory', genbankKey: 'terminator', description: 'Transcription termination or pause sequence.' },
  { id: 'polyA_signal', label: 'PolyA Signal', category: 'regulatory', genbankKey: 'polyA_signal', aliases: ['polyA_site', 'polyadenylation_signal'], description: 'Polyadenylation recognition signal (e.g. AAUAAA, BGH, SV40 late).' },
  { id: "5'UTR", label: "5' UTR", category: 'regulatory', genbankKey: '5\'UTR', aliases: ['five_prime_utr', '5_prime_utr', '5UTR'], description: '5-prime untranslated region preceding the start codon.' },
  { id: "3'UTR", label: "3' UTR", category: 'regulatory', genbankKey: '3\'UTR', aliases: ['three_prime_utr', '3_prime_utr', '3UTR'], description: '3-prime untranslated region following the stop codon.' },
  { id: 'RBS', label: 'Ribosome Binding Site (RBS)', category: 'regulatory', genbankKey: 'RBS', aliases: ['Shine_Dalgarno', 'Kozak'], description: 'Translation initiation site on mRNA (Shine-Dalgarno in prokaryotes, Kozak in eukaryotes).' },
  { id: 'regulatory', label: 'Regulatory Element', category: 'regulatory', genbankKey: 'regulatory', description: 'General non-coding transcriptional or translational regulator.' },
  { id: 'enhancer', label: 'Enhancer', category: 'regulatory', genbankKey: 'enhancer', description: 'Transcriptional regulatory element increasing promoter activity.' },
  { id: 'operator', label: 'Operator', category: 'regulatory', genbankKey: 'operator', description: 'DNA element bound by repressor or activator transcription factors (e.g. lacO, tetO).' },

  // ─── Non-Coding RNAs ───────────────────────────────────────────────────
  { id: 'ncRNA', label: 'ncRNA', category: 'rna', genbankKey: 'ncRNA', description: 'Functional non-protein-coding RNA transcript.' },
  { id: 'lncRNA', label: 'lncRNA', category: 'rna', genbankKey: 'lncRNA', description: 'Long non-coding RNA (>200 nt).' },
  { id: 'tRNA', label: 'tRNA', category: 'rna', genbankKey: 'tRNA', description: 'Transfer RNA molecule delivering amino acids during translation.' },
  { id: 'rRNA', label: 'rRNA', category: 'rna', genbankKey: 'rRNA', description: 'Ribosomal structural/catalytic RNA component.' },
  { id: 'snRNA', label: 'snRNA', category: 'rna', genbankKey: 'snRNA', description: 'Small nuclear RNA involved in spliceosome machinery.' },
  { id: 'snoRNA', label: 'snoRNA', category: 'rna', genbankKey: 'snoRNA', description: 'Small nucleolar RNA guiding chemical modifications of RNA.' },

  // ─── Structural & Mobile Elements ──────────────────────────────────────
  { id: 'origin', label: 'Origin of Replication (ori)', category: 'structural', genbankKey: 'rep_origin', aliases: ['rep_origin', 'ori', 'origin_of_replication'], description: 'Replication origin enabling autonomous plasmid replication (e.g. pUC, p15A, ColE1, f1).' },
  { id: 'repeat_region', label: 'Repeat Region', category: 'structural', genbankKey: 'repeat_region', description: 'Direct or inverted sequence repeat (e.g. ITR, inverted repeats).' },
  { id: 'LTR', label: 'Long Terminal Repeat (LTR)', category: 'structural', genbankKey: 'LTR', description: 'Retroviral or retrotransposon flanking long terminal repeat.' },
  { id: 'transposon', label: 'Transposon / Mobile Element', category: 'structural', genbankKey: 'mobile_element', aliases: ['mobile_element', 'transposon'], description: 'Transposable genetic element or IS element.' },
  { id: 'engineered_region', label: 'Engineered Region', category: 'structural', genbankKey: 'misc_feature', aliases: ['engineered_tag', 'synthetic_sequence'], description: 'Custom engineered DNA cassette or linker.' },
  { id: 'misc_structure', label: 'Secondary Structure', category: 'structural', genbankKey: 'misc_structure', description: 'Hairpin, G-quadruplex, pseudoknot, or cruciform DNA structure.' },

  // ─── Binding & Cleavage ─────────────────────────────────────────────────
  { id: 'protein_bind', label: 'Protein Binding Site', category: 'binding', genbankKey: 'protein_bind', aliases: ['binding_site'], description: 'Specific recognition region for DNA-binding proteins.' },
  { id: 'primer_bind', label: 'Primer Binding Site', category: 'binding', genbankKey: 'primer_bind', description: 'Region annealing with sequencing or PCR primers.' },
  { id: 'misc_binding', label: 'Binding Site (General)', category: 'binding', genbankKey: 'misc_binding', description: 'Small molecule, cofactor, or nucleic-acid binding site.' },
  { id: 'misc_difference', label: 'Sequence Variation / Mutation', category: 'binding', genbankKey: 'misc_difference', aliases: ['variation', 'mutation'], description: 'Site of point mutation, polymorphism, or mismatch.' },

  // ─── Synthetic, Recombination & Markers ─────────────────────────────────
  { id: 'resistance marker', label: 'Selectable Marker', category: 'synthetic', genbankKey: 'CDS', aliases: ['resistance_marker', 'antibiotic_resistance', 'selectable_marker'], description: 'Antibiotic resistance or metabolic auxotrophic selection gene (e.g. AmpR, KanR, CamR, PuroR).' },
  { id: 'tag', label: 'Epitope / Affinity Tag', category: 'synthetic', genbankKey: 'misc_feature', aliases: ['affinity_tag', 'epitope_tag'], description: 'Peptide tag for purification or detection (e.g. FLAG, HA, Myc, 6xHis, Strep-tag).' },
  { id: 'reporter', label: 'Fluorescent / Luminescent Reporter', category: 'synthetic', genbankKey: 'CDS', aliases: ['fluorescent_protein', 'reporter_gene'], description: 'Visible or measurable reporter protein (e.g. GFP, EGFP, mCherry, Luciferase).' },
  { id: 'crispr_target', label: 'CRISPR Guide / Target Site', category: 'synthetic', genbankKey: 'misc_feature', aliases: ['gRNA_target', 'spacer', 'protospacer'], description: 'Cas endonuclease target sequence with PAM.' },
  { id: 'recombination_site', label: 'Recombination Site', category: 'synthetic', genbankKey: 'misc_feature', description: 'General site-specific recombination sequence.' },
  { id: 'att_site', label: 'Gateway att Site', category: 'synthetic', genbankKey: 'misc_feature', aliases: ['attB', 'attP', 'attL', 'attR'], description: 'Bacteriophage lambda site-specific recombination site (attB/P/L/R).' },
  { id: 'loxP_site', label: 'loxP Site', category: 'synthetic', genbankKey: 'misc_feature', aliases: ['loxP', 'lox2272'], description: 'Cre recombinase 34 bp target site.' },
  { id: 'frt_site', label: 'FRT Site', category: 'synthetic', genbankKey: 'misc_feature', aliases: ['FRT'], description: 'Flp recombinase 34 bp target site.' },

  // ─── General & Uncategorized ───────────────────────────────────────────
  { id: 'source', label: 'Source Organism / Molecule', category: 'general', genbankKey: 'source', description: 'Biological or synthetic origin of the sequence construct.' },
  { id: 'misc_feature', label: 'Miscellaneous Feature', category: 'general', genbankKey: 'misc_feature', description: 'General annotation that does not fit into specific ontologies.' }
] as const satisfies readonly FeatureTypeMetadata[];

export const FEATURE_TYPES = FEATURE_DEFINITIONS.map(d => d.id) as readonly string[];
export type FeatureType = (typeof FEATURE_DEFINITIONS)[number]['id'];

// ─── Fast Alias & Normalization Index ────────────────────────────────────

const FEATURE_TYPE_MAP = new Map<string, FeatureType>();

for (const def of FEATURE_DEFINITIONS) {
  FEATURE_TYPE_MAP.set(def.id.toLowerCase(), def.id);
  FEATURE_TYPE_MAP.set(def.genbankKey.toLowerCase(), def.id);
  const aliases = (def as { aliases?: readonly string[] }).aliases;
  if (aliases) {
    for (const alias of aliases) {
      FEATURE_TYPE_MAP.set(alias.toLowerCase(), def.id);
    }
  }
}

/**
 * Normalizes input strings (from GenBank files, user inputs, or external tools)
 * to canonical FeatureType. Returns 'misc_feature' if unrecognized.
 */
export function normalizeFeatureType(rawType: string): FeatureType {
  if (!rawType || typeof rawType !== 'string') return 'misc_feature';
  const clean = rawType.trim().toLowerCase();
  return FEATURE_TYPE_MAP.get(clean) || 'misc_feature';
}

/**
 * Retrieves full metadata for a FeatureType.
 */
export function getFeatureTypeMetadata(type: FeatureType): FeatureTypeMetadata {
  return FEATURE_DEFINITIONS.find(d => d.id === type) || {
    id: type,
    label: type,
    category: 'general',
    genbankKey: 'misc_feature',
    description: 'Feature annotation'
  };
}

/**
 * Returns features grouped by semantic category for UI menus and pickers.
 */
export function getFeatureTypesByCategory(): Record<FeatureCategory, FeatureTypeMetadata[]> {
  const grouped: Record<FeatureCategory, FeatureTypeMetadata[]> = {
    coding: [],
    regulatory: [],
    rna: [],
    structural: [],
    binding: [],
    synthetic: [],
    general: []
  };

  for (const def of FEATURE_DEFINITIONS) {
    grouped[def.category].push(def);
  }

  return grouped;
}
