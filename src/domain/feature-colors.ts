import type { FeatureType } from './feature';

/**
 * Returns the CSS variable corresponding to the feature type.
 * These automatically adapt to light/dark themes in DOM and SVG contexts.
 */
export function getFeatureColor(type: FeatureType): string {
  switch (type) {
    case 'CDS':
    case 'gene':
      return 'var(--bio-cds)';
    case 'promoter':
      return 'var(--bio-promoter)';
    case 'terminator':
      return 'var(--warning)';
    case 'origin':
      return 'var(--bio-origin)';
    case 'resistance marker':
      return 'var(--danger)';
    case 'tag':
      return 'var(--bio-primer)';
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
      case 'CDS':
      case 'gene':
        return '#818CF8';
      case 'promoter':
        return '#F2B45B';
      case 'terminator':
        return '#F0B35C';
      case 'origin':
        return '#35B8AC';
      case 'resistance marker':
        return '#FF8585';
      case 'tag':
        return '#45C4D4';
      case 'source':
        return '#91A49F';
      case 'misc_feature':
      default:
        return '#A78BFA';
    }
  }

  switch (type) {
    case 'CDS':
    case 'gene':
      return '#4F46E5';
    case 'promoter':
      return '#B86B00';
    case 'terminator':
      return '#9A5B00';
    case 'origin':
      return '#0D8178';
    case 'resistance marker':
      return '#B83232';
    case 'tag':
      return '#087E8B';
    case 'source':
      return '#647570';
    case 'misc_feature':
    default:
      return '#7C3AED';
  }
}
