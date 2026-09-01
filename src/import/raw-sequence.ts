import type { SequenceDocument } from '../domain/document';
import { ScientificSequence } from '../scientific/nucleotide';
import { generateId } from '../utils/id';
import { inferAlphabet } from '../scientific/alphabet';

export function importRawSequence(data: string, name: string = 'Untitled Sequence'): SequenceDocument {
  const cleaned = data.replace(/\s+/g, '');
  const alphabet = inferAlphabet(cleaned);
  
  return {
    id: generateId(),
    name,
    topology: 'linear',
    sequence: new ScientificSequence(cleaned, alphabet),
    alphabet,
    features: [],
    primers: [],
    source: 'raw',
    version: 1
  };
}
