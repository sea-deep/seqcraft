import { Seq, Translation } from 'nucleotide-sequence';
import type { BaseDifference, CanonicalFeature, CanonicalSequence, FeatureDifference, ProteinConsequence, ProteinConsequenceKind } from '../domain/sequence-diff';
import { reverseComplementIupac } from './restriction-analysis';

function intervalTouchesDifference(feature: CanonicalFeature, difference: BaseDifference, side: 'reference' | 'query'): boolean {
  const start0 = side === 'reference' ? difference.referenceStart0 : difference.queryStart0;
  const end0Exclusive = side === 'reference' ? difference.referenceEnd0Exclusive : difference.queryEnd0Exclusive;
  return feature.segments.some(segment => end0Exclusive === start0
    ? segment.start0 <= start0 && start0 <= segment.end0Exclusive
    : Math.max(segment.start0, start0) < Math.min(segment.end0Exclusive, end0Exclusive));
}

function orderedCircularSegments(feature: CanonicalFeature, length: number): CanonicalFeature['segments'] {
  const segments = [...feature.segments].sort((left, right) => left.start0 - right.start0);
  if (segments.length < 2 || length === 0) return segments;
  let largestGap = -1;
  let startIndex = 0;
  for (let index = 0; index < segments.length; index++) {
    const current = segments[index];
    const next = segments[(index + 1) % segments.length];
    const gap = index === segments.length - 1
      ? next.start0 + length - current.end0Exclusive
      : next.start0 - current.end0Exclusive;
    if (gap > largestGap) {
      largestGap = gap;
      startIndex = (index + 1) % segments.length;
    }
  }
  return [...segments.slice(startIndex), ...segments.slice(0, startIndex)];
}

function featureCodingSequence(canonical: CanonicalSequence, feature: CanonicalFeature): string {
  const ordered = canonical.topology === 'circular'
    ? orderedCircularSegments(feature, canonical.length)
    : [...feature.segments].sort((left, right) => left.start0 - right.start0);
  let sequence = ordered.map(segment => canonical.sequence.slice(segment.start0, segment.end0Exclusive)).join('');
  if (feature.strand === -1) sequence = reverseComplementIupac(sequence);
  const codonStartValue = feature.qualifiers.codon_start;
  const codonStart = Number(Array.isArray(codonStartValue) ? codonStartValue[0] : codonStartValue);
  if (Number.isInteger(codonStart) && codonStart >= 1 && codonStart <= 3) sequence = sequence.slice(codonStart - 1);
  return sequence;
}

function geneticCode(feature: CanonicalFeature): 1 | 2 | 11 {
  const raw = feature.qualifiers.transl_table;
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return value === 2 || value === 11 ? value : 1;
}

function translate(sequence: string, table: 1 | 2 | 11): string {
  if (sequence.length < 3) return '';
  return Translation.translate(new Seq('DNA').read(sequence.slice(0, sequence.length - (sequence.length % 3))), table);
}

function firstProteinDifference(reference: string, query: string): number | null {
  const length = Math.max(reference.length, query.length);
  for (let index = 0; index < length; index++) if (reference[index] !== query[index]) return index + 1;
  return null;
}

function consequenceKinds(referenceDna: string, queryDna: string, referenceProtein: string, queryProtein: string): ProteinConsequenceKind[] {
  const kinds = new Set<ProteinConsequenceKind>();
  const delta = queryDna.length - referenceDna.length;
  if (delta % 3 !== 0) kinds.add('frameshift');
  else if (delta > 0) kinds.add('inframe_insertion');
  else if (delta < 0) kinds.add('inframe_deletion');
  if (referenceProtein === queryProtein) kinds.add('synonymous');
  if (referenceProtein.startsWith('M') && !queryProtein.startsWith('M')) kinds.add('start_lost');
  const referenceStop = referenceProtein.indexOf('*');
  const queryStop = queryProtein.indexOf('*');
  if (queryStop >= 0 && (referenceStop < 0 || queryStop < referenceStop)) kinds.add('nonsense');
  if (referenceStop >= 0 && (queryStop < 0 || queryStop > referenceStop)) kinds.add('stop_lost');
  if (referenceProtein !== queryProtein && !kinds.has('nonsense') && !kinds.has('stop_lost')) kinds.add('missense');
  if (kinds.size === 0) kinds.add('coding_sequence_change');
  const order: ProteinConsequenceKind[] = ['frameshift', 'nonsense', 'stop_lost', 'start_lost', 'inframe_insertion', 'inframe_deletion', 'missense', 'synonymous', 'coding_sequence_change'];
  return order.filter(kind => kinds.has(kind));
}

export function reportProteinConsequences(
  reference: CanonicalSequence,
  query: CanonicalSequence,
  differences: BaseDifference[],
  featureDifferences: FeatureDifference[],
): ProteinConsequence[] {
  const queryByReferenceId = new Map<string, CanonicalFeature>(query.features.map(feature => [feature.originalId, feature]));
  for (const [referenceId, queryFeature] of featureDifferences
    .filter(item => item.referenceFeature && item.queryFeature)
    .map(item => [item.referenceFeature!.originalId, item.queryFeature!] as const)) queryByReferenceId.set(referenceId, queryFeature);
  const consequences: ProteinConsequence[] = [];

  for (const referenceFeature of reference.features.filter(feature => feature.type === 'CDS')) {
    const affected = differences.filter(difference => intervalTouchesDifference(referenceFeature, difference, 'reference'));
    if (affected.length === 0) continue;
    const queryFeature = queryByReferenceId.get(referenceFeature.originalId) ?? null;
    const referenceDna = featureCodingSequence(reference, referenceFeature);
    const table = geneticCode(referenceFeature);
    const referenceProtein = translate(referenceDna, table);
    const queryDna = queryFeature ? featureCodingSequence(query, queryFeature) : null;
    const queryProtein = queryDna === null ? null : translate(queryDna, table);
    const firstAffected = queryProtein === null ? null : firstProteinDifference(referenceProtein, queryProtein);
    const sliceStart = firstAffected === null ? 0 : Math.max(0, firstAffected - 3);
    const sliceEnd = firstAffected === null ? 0 : firstAffected + 2;
    consequences.push({
      id: `protein:${referenceFeature.id}`,
      referenceFeatureId: referenceFeature.id,
      queryFeatureId: queryFeature?.id ?? null,
      featureName: referenceFeature.name,
      kinds: queryDna === null || queryProtein === null
        ? ['coding_sequence_change']
        : consequenceKinds(referenceDna, queryDna, referenceProtein, queryProtein),
      geneticCodeTable: table,
      referenceCodingLengthBp: referenceDna.length,
      queryCodingLengthBp: queryDna?.length ?? null,
      referenceProtein,
      queryProtein,
      firstAffectedAminoAcid1: firstAffected,
      referenceAminoAcids: firstAffected === null ? '' : referenceProtein.slice(sliceStart, sliceEnd),
      queryAminoAcids: firstAffected === null || queryProtein === null ? '' : queryProtein.slice(sliceStart, sliceEnd),
      affectedDifferenceIds: affected.map(difference => difference.id),
    });
  }
  return consequences.sort((left, right) => left.referenceFeatureId.localeCompare(right.referenceFeatureId));
}
