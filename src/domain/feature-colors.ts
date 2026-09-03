import type { FeatureType } from './feature';
import type { FeatureCategory } from './feature-ontology';

/**
 * Category-level default CSS variables.
 */
export const CATEGORY_CSS_VARS: Record<FeatureCategory, string> = {
  coding: 'var(--bio-cds)',
  regulatory: 'var(--bio-promoter)',
  rna: 'var(--bio-primer)',
  structural: 'var(--bio-origin)',
  binding: 'var(--bio-misc)',
  synthetic: 'var(--bio-primer)',
  general: 'var(--bio-misc)'
};

/**
 * Returns the CSS variable corresponding to the feature type.
 * Automatically adapts to light/dark themes in DOM and SVG contexts.
 */
export function getFeatureColor(type: FeatureType): string {
  switch (type) {
    // Coding & Expression
    case 'CDS':
    case 'gene':
    case 'exon':
      return 'var(--bio-cds)';
    case 'intron':
      return 'var(--text-muted)';
    case 'signal_peptide':
    case 'transit_peptide':
    case 'cleavage_site':
      return 'var(--bio-primer)';

    // Regulatory
    case 'promoter':
    case 'enhancer':
      return 'var(--bio-promoter)';
    case 'terminator':
    case 'polyA_signal':
      return 'var(--warning)';
    case 'operator':
    case 'RBS':
    case 'regulatory':
      return 'var(--bio-promoter)';
    case "5'UTR":
    case "3'UTR":
      return 'var(--text-muted)';

    // RNA
    case 'ncRNA':
    case 'lncRNA':
    case 'tRNA':
    case 'rRNA':
    case 'snRNA':
    case 'snoRNA':
      return 'var(--bio-primer)';

    // Structural
    case 'origin':
      return 'var(--bio-origin)';
    case 'repeat_region':
    case 'LTR':
    case 'transposon':
    case 'engineered_region':
    case 'misc_structure':
      return 'var(--bio-misc)';

    // Binding
    case 'protein_bind':
    case 'misc_binding':
    case 'primer_bind':
      return 'var(--bio-primer)';
    case 'misc_difference':
      return 'var(--danger)';

    // Synthetic & Recombination
    case 'resistance marker':
      return 'var(--danger)';
    case 'tag':
      return 'var(--bio-primer)';
    case 'reporter':
      return 'var(--bio-origin)';
    case 'crispr_target':
    case 'recombination_site':
    case 'att_site':
    case 'loxP_site':
    case 'frt_site':
      return 'var(--bio-misc)';

    // General
    case 'source':
      return 'var(--text-muted)';
    case 'misc_feature':
    default:
      return 'var(--bio-misc)';
  }
}

/**
 * Returns a deterministic hex color for contexts (like WebGL / Three.js)
 * that cannot evaluate CSS variables directly.
 */
export function getFeatureHexColor(type: FeatureType, isDark = false): string {
  if (isDark) {
    switch (type) {
      // Coding
      case 'CDS':
      case 'gene':
      case 'exon':
        return '#818CF8'; // Indigo
      case 'intron':
        return '#64748B'; // Slate
      case 'signal_peptide':
      case 'transit_peptide':
      case 'cleavage_site':
        return '#38BDF8'; // Sky blue

      // Regulatory
      case 'promoter':
      case 'enhancer':
        return '#F59E0B'; // Amber
      case 'terminator':
      case 'polyA_signal':
        return '#F97316'; // Orange/Red
      case 'operator':
      case 'RBS':
      case 'regulatory':
        return '#FBBF24'; // Warm yellow
      case "5'UTR":
      case "3'UTR":
        return '#94A3B8'; // Muted slate

      // RNA
      case 'ncRNA':
      case 'lncRNA':
      case 'tRNA':
      case 'rRNA':
      case 'snRNA':
      case 'snoRNA':
        return '#06B6D4'; // Cyan

      // Structural
      case 'origin':
        return '#10B981'; // Emerald
      case 'repeat_region':
      case 'LTR':
      case 'transposon':
      case 'engineered_region':
      case 'misc_structure':
        return '#A855F7'; // Purple

      // Binding
      case 'protein_bind':
      case 'misc_binding':
      case 'primer_bind':
        return '#0EA5E9'; // Sky
      case 'misc_difference':
        return '#EF4444'; // Red

      // Synthetic
      case 'resistance marker':
        return '#F43F5E'; // Rose/Red
      case 'tag':
        return '#38BDF8'; // Light blue
      case 'reporter':
        return '#22C55E'; // Fluorescent green
      case 'crispr_target':
      case 'recombination_site':
      case 'att_site':
      case 'loxP_site':
      case 'frt_site':
        return '#EC4899'; // Pink/Magenta

      // General
      case 'source':
        return '#6B7280'; // Gray
      case 'misc_feature':
      default:
        return '#A78BFA'; // Violet
    }
  }

  // Light theme
  switch (type) {
    // Coding
    case 'CDS':
    case 'gene':
    case 'exon':
      return '#4F46E5';
    case 'intron':
      return '#94A3B8';
    case 'signal_peptide':
    case 'transit_peptide':
    case 'cleavage_site':
      return '#0284C7';

    // Regulatory
    case 'promoter':
    case 'enhancer':
      return '#D97706';
    case 'terminator':
    case 'polyA_signal':
      return '#EA580C';
    case 'operator':
    case 'RBS':
    case 'regulatory':
      return '#B45309';
    case "5'UTR":
    case "3'UTR":
      return '#64748B';

    // RNA
    case 'ncRNA':
    case 'lncRNA':
    case 'tRNA':
    case 'rRNA':
    case 'snRNA':
    case 'snoRNA':
      return '#0891B2';

    // Structural
    case 'origin':
      return '#059669';
    case 'repeat_region':
    case 'LTR':
    case 'transposon':
    case 'engineered_region':
    case 'misc_structure':
      return '#9333EA';

    // Binding
    case 'protein_bind':
    case 'misc_binding':
    case 'primer_bind':
      return '#0284C7';
    case 'misc_difference':
      return '#DC2626';

    // Synthetic
    case 'resistance marker':
      return '#E11D48';
    case 'tag':
      return '#0284C7';
    case 'reporter':
      return '#16A34A';
    case 'crispr_target':
    case 'recombination_site':
    case 'att_site':
    case 'loxP_site':
    case 'frt_site':
      return '#DB2777';

    // General
    case 'source':
      return '#4B5563';
    case 'misc_feature':
    default:
      return '#7C3AED';
  }
}
