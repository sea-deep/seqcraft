import type { SequenceDocument } from '../domain/document';
import { ScientificSequence } from '../scientific/nucleotide';
import { generateId } from '../utils/id';
import { inferAlphabet, sanitizeSequence } from '../scientific/alphabet';

export function importRawSequence(data: string, name: string = 'Untitled Sequence'): SequenceDocument {
  const cleaned = sanitizeSequence(data);
  const alphabet = inferAlphabet(cleaned);
  
  return {
    id: generateId(),
    name,
    topology: 'linear',
    sequence: new ScientificSequence(cleaned, alphabet),
    length: cleaned.length,
    storageMode: 'memory',
    alphabet,
    features: [],
    primers: [],
    source: 'raw',
    version: 1
  };
}
