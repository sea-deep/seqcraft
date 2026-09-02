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
        return items.map((item: any) => ({
          ...item,
          sequence: new ScientificSequence(item.sequence, item.alphabet || 'DNA'), length: item.length, storageMode: 'memory'
        })) as SequenceDocument[];
      }
    } catch (e) {
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
