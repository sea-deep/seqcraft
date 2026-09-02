import type { FeatureType } from './feature';

export function getFeatureColor(type: FeatureType): string {
  switch (type) {
    case 'CDS':
    case 'gene':
      return '#4f46e5'; // indigo
    case 'promoter':
      return '#d97706'; // amber
    case 'terminator':
      return '#9a5b00'; // warm amber/orange
    case 'origin':
      return '#0d9488'; // teal
    case 'resistance marker':
      return '#b83232'; // danger / crimson
    case 'tag':
      return '#0891b2'; // cyan
    case 'source':
      return '#64748b'; // slate
    case 'misc_feature':
    default:
      return '#7c3aed'; // violet
  }
}
