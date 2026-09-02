import { ScientificSequence } from '../scientific/nucleotide';
import type { Feature } from './feature';
import type { Primer } from './primer';

export type Topology = "linear" | "circular";
export type DocumentSource = "fasta" | "genbank" | "raw" | "demo" | "pcr_product" | "cloning_preview";

export type StorageMode = 'memory' | 'chunked';

export interface DocumentCapabilities {
  sequenceView: true;
  regionExtraction: true;
  wholeSequenceAnalysis: boolean;
  annotations: boolean;
  primers: boolean;
  pcr: boolean;
  cloning: boolean;
  map: boolean;
}

export interface ChunkedStorageReference {
  backend: 'opfs';
  key: string;
}

export interface SequenceDocument {
  id: string;
  name: string;
  topology: Topology;
  sequence: ScientificSequence | null; // null if storageMode === 'chunked'
  length: number;
  storageMode: StorageMode;
  storageRef?: ChunkedStorageReference;
  alphabet: "DNA" | "RNA" | "MIXED" | "UNKNOWN";
  features: Feature[];
  primers: Primer[];
  source: DocumentSource;
  version: number;
}

export function getDocumentCapabilities(document: Pick<SequenceDocument, 'storageMode'>): DocumentCapabilities {
  const inMemory = document.storageMode === 'memory';
  return {
    sequenceView: true, regionExtraction: true,
    wholeSequenceAnalysis: inMemory, annotations: inMemory, primers: inMemory,
    pcr: inMemory, cloning: inMemory, map: inMemory,
  };
}

export function assertDocumentInvariant(document: SequenceDocument): void {
  if (!Number.isSafeInteger(document.length) || document.length < 0) {
    throw new Error(`Document ${document.id} has an invalid sequence length`);
  }
  if (document.storageMode === 'memory') {
    if (!document.sequence || document.sequence.length !== document.length) {
      throw new Error(`Memory document ${document.id} must own a sequence matching its declared length`);
    }
    if (document.storageRef) throw new Error(`Memory document ${document.id} cannot have a chunked storage reference`);
    return;
  }
  if (document.sequence !== null) throw new Error(`Chunked document ${document.id} cannot contain sequence bytes in application state`);
  if (document.storageRef?.backend !== 'opfs' || !document.storageRef.key) {
    throw new Error(`Chunked document ${document.id} must reference an OPFS sequence`);
  }
}
