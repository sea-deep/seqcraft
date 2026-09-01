import type { FeatureType } from './feature';

export function getFeatureColor(type: FeatureType): string {
  if (type === 'CDS' || type === 'gene') {
    return '#4f46e5'; // indigo
  } else if (type === 'promoter') {
    return '#d97706'; // amber
  } else if (type === 'origin') {
    return '#0d9488'; // teal
  } else {
    return '#7c3aed'; // violet
  }
}
