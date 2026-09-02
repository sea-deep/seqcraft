import type { Feature, SequenceInterval } from '../domain/feature';
import type { Topology } from '../domain/document';
import { KNOWN_FEATURES, type KnownFeatureDefinition } from '../data/known-features';
import { reverseComplementIupac } from './restriction-analysis';

export interface KnownFeatureMatch {
  id: string;
  definitionId: string;
  name: string;
  type: Feature['type'];
  strand: Feature['strand'];
  segments: SequenceInterval[];
  lengthBp: number;
  description: string;
  alreadyAnnotated: boolean;
}

function findOccurrences(sequence: string, motif: string, topology: Topology): number[] {
  if (!motif || motif.length > sequence.length) return [];
  const searchable = topology === 'circular'
    ? sequence + sequence.slice(0, Math.max(0, motif.length - 1))
    : sequence;
  const starts: number[] = [];
  let cursor = 0;
  while (cursor <= searchable.length - motif.length) {
    const start0 = searchable.indexOf(motif, cursor);
    if (start0 === -1 || start0 >= sequence.length) break;
    starts.push(start0);
    cursor = start0 + 1;
  }
  return starts;
}

function toSegments(start0: number, lengthBp: number, sequenceLength: number): SequenceInterval[] {
  const end0Exclusive = start0 + lengthBp;
  return end0Exclusive <= sequenceLength
    ? [{ start0, end0Exclusive }]
    : [{ start0, end0Exclusive: sequenceLength }, { start0: 0, end0Exclusive: end0Exclusive - sequenceLength }];
}

function sameSegments(left: SequenceInterval[], right: SequenceInterval[]): boolean {
  return left.length === right.length && left.every((segment, index) => (
    segment.start0 === right[index]?.start0 && segment.end0Exclusive === right[index]?.end0Exclusive
  ));
}

export function detectKnownFeatures(
  rawSequence: string,
  topology: Topology,
  existingFeatures: Feature[] = [],
  library: readonly KnownFeatureDefinition[] = KNOWN_FEATURES,
): KnownFeatureMatch[] {
  const sequence = rawSequence.toUpperCase().replaceAll('U', 'T');
  if (sequence.length === 0) return [];
  const matches: KnownFeatureMatch[] = [];

  for (const definition of library) {
    const forward = definition.sequence.toUpperCase();
    const reverse = reverseComplementIupac(forward);
    const strands: Array<{ motif: string; strand: Feature['strand'] }> = [
      { motif: forward, strand: 1 },
      ...(reverse === forward ? [] : [{ motif: reverse, strand: -1 as const }]),
    ];

    for (const { motif, strand } of strands) {
      for (const start0 of findOccurrences(sequence, motif, topology)) {
        const segments = toSegments(start0, motif.length, sequence.length);
        const alreadyAnnotated = existingFeatures.some(feature => sameSegments(feature.segments, segments));
        matches.push({
          id: `${definition.id}:${start0}:${strand}`,
          definitionId: definition.id,
          name: definition.name,
          type: definition.type,
          strand,
          segments,
          lengthBp: motif.length,
          description: definition.description,
          alreadyAnnotated,
        });
      }
    }
  }

  return matches.sort((left, right) => (
    left.segments[0].start0 - right.segments[0].start0 || left.name.localeCompare(right.name)
  ));
}

export function matchToDetectedFeature(match: KnownFeatureMatch): Feature {
  return {
    id: `detected-${match.id}`,
    name: match.name,
    type: match.type,
    strand: match.strand,
    segments: match.segments,
    qualifiers: {
      note: match.description,
      detection: 'Exact match from SeqCraft built-in known-feature library',
      libraryId: match.definitionId,
    },
    source: 'detected',
  };
}
