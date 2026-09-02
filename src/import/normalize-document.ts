import type { Alphabet } from 'nucleotide-sequence';
import type { SequenceDocument } from '../domain/document';
import { ScientificSequence } from '../scientific/nucleotide';
import { importFasta } from './fasta';
import { importGenBank } from './genbank';
import { importRawSequence } from './raw-sequence';

/**
 * Normalizes sequence data into SequenceDocument array.
 */
export function importDocument(data: string, name?: string): SequenceDocument[] {
  const trimmed = data.trim();
  
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      if (items.length > 0 && items[0].id && items[0].sequence) {
        return items.map((item: Record<string, unknown>) => ({
          ...item,
          sequence: new ScientificSequence(item.sequence as string, (item.alphabet as Alphabet) || 'DNA'),
          length: item.length as number,
          storageMode: 'memory',
        })) as unknown as SequenceDocument[];
      }
    } catch {
      // Fall through to raw sequence parsing if it's not valid JSON
    }
  }

  if (trimmed.startsWith('LOCUS')) {
    return importGenBank(data);
  } else if (trimmed.startsWith('>')) {
    return importFasta(data);
  } else {
    // Raw DNA sequence
    return [importRawSequence(data, name)];
  }
}
