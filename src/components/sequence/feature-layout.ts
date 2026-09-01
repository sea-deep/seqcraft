import type { Feature } from '../../domain/feature';

export function deduplicateFeaturesForDisplay(features: Feature[]): Feature[] {
  // If multiple features have the exact same boundaries and name, 
  // prefer CDS > promoter > gene > misc_feature.
  // Wait, the prompt specifically says:
  // "If both a gene and CDS describe exactly the same region/name, avoid rendering two identical full-width tracks directly on top of each other... Prefer the more informative CDS representation"
  
  const typePriority: Record<string, number> = {
    'CDS': 100,
    'promoter': 90,
    'origin': 80,
    'gene': 50,
    'misc_feature': 10
  };

  const getPriority = (f: Feature) => typePriority[f.type] || 0;

  // Group by a strict serialization of name + segments
  const groups = new Map<string, Feature[]>();
  
  for (const f of features) {
    // Only group if segments match exactly
    const boundsKey = f.segments.map(s => `${s.start0}-${s.end0Exclusive}`).join(',');
    const key = `${f.name}|${f.strand}|${boundsKey}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(f);
  }

  const result: Feature[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      // Sort by priority descending
      group.sort((a, b) => getPriority(b) - getPriority(a));
      result.push(group[0]); // Keep the highest priority one
    }
  }

  return result;
}

export const BASES_PER_LINE = 60;

export function getLineIndexForLabel(feature: Feature, seqLength: number): number {
  const lineCount = Math.ceil(seqLength / BASES_PER_LINE);
  for (let i = 0; i < lineCount; i++) {
    const lineStart = i * BASES_PER_LINE;
    const lineEnd = lineStart + BASES_PER_LINE;
    let overlap = 0;
    for (const seg of feature.segments) {
      const start = Math.max(lineStart, seg.start0);
      const end = Math.min(lineEnd, seg.end0Exclusive);
      if (start < end) overlap += (end - start);
    }
    if (overlap >= 5) return i;
  }
  if (feature.segments.length > 0) return Math.floor(feature.segments[0].start0 / BASES_PER_LINE);
  return -1;
}
