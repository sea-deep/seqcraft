import type { SequenceDocument } from '../domain/document';
import type { ScientificSequence } from '../scientific/nucleotide';

export function getMemorySequence(doc: SequenceDocument): ScientificSequence {
  if (doc.storageMode !== 'memory' || !doc.sequence) {
    throw new Error('This operation is not supported for large reference documents.');
  }
  return doc.sequence;
}

export function getSequenceStorageKey(doc: SequenceDocument): string {
  if (doc.storageMode !== 'chunked' || !doc.storageRef) {
    throw new Error('Document does not have chunked sequence storage.');
  }
  return doc.storageRef.key;
}
