import { Seq, type Alphabet } from 'nucleotide-sequence';
import type { SequenceDocument } from '../domain/document';
import { ScientificSequence } from '../scientific/nucleotide';
import { generateId } from '../utils/id';
import { inferAlphabet } from '../scientific/alphabet';

export function importFasta(data: string, defaultName = 'FASTA Sequence'): SequenceDocument[] {
  const records = Seq.readFASTA(data);
  return records.map((r, idx) => {
    const seqString = r.seq.sequence();
    
    // Explicitly infer ignoring Seq's default DNA guess if it guessed DNA without Ts
    // Wait, if it had explicit FASTA type, it might be set, but readFASTA doesn't usually know.
    let alphabet: Alphabet = inferAlphabet(seqString);

    return {
      id: generateId(),
      name: r.id || `${defaultName} ${idx + 1}`,
      topology: 'linear',
      sequence: new ScientificSequence(seqString, alphabet),
      length: seqString.length,
      storageMode: 'memory',
      alphabet,
      features: [],
      primers: [],
      source: 'fasta',
      version: 1
    };
  });
}
