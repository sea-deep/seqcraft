import { ScientificSequence } from '../scientific/nucleotide';
import type { Feature } from './feature';
import type { Primer } from './primer';

export type Topology = "linear" | "circular";
export type DocumentSource = "fasta" | "genbank" | "raw" | "demo" | "pcr_product" | "cloning_preview";

export interface SequenceDocument {
  id: string;
  name: string;
  topology: Topology;
  sequence: ScientificSequence;
  alphabet: "DNA" | "RNA" | "MIXED" | "UNKNOWN";
  features: Feature[];
  primers: Primer[];
  source: DocumentSource;
  version: number;
}
