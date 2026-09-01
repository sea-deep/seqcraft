import type { SequenceDocument } from '../domain/document';
import { importFasta } from './fasta';
import { importGenBank } from './genbank';
import { importRawSequence } from './raw-sequence';

/**
 * Normalizes sequence data into SequenceDocument array.
 */
export function importDocument(data: string, name?: string): SequenceDocument[] {
  const trimmed = data.trim();
  
  if (trimmed.startsWith('LOCUS')) {
    return importGenBank(data);
  } else if (trimmed.startsWith('>')) {
    return importFasta(data);
  } else {
    // Raw DNA sequence
    return [importRawSequence(data, name)];
  }
}
