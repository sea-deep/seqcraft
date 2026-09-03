export interface DatabaseSearchResult {
  accession: string;
  title: string;
  organism?: string;
  lengthBp?: number;
  moleculeType?: string;
  topology?: 'linear' | 'circular';
  provider: string;
  sourceUrl?: string;
}

export interface ResolvedSequence {
  accession: string;
  name: string;
  rawText: string;
  format: 'genbank' | 'fasta';
  provider: string;
  sourceUrl: string;
  definition?: string;
  organism?: string;
  lengthBp?: number;
  topology?: 'linear' | 'circular';
  featureCount?: number;
}

export interface ResolveOptions {
  format?: 'genbank' | 'fasta';
  signal?: AbortSignal;
}

export interface SearchOptions {
  limit?: number;
  signal?: AbortSignal;
}

export interface SequenceProvider {
  id: string;
  name: string;
  description: string;
  exampleAccessions: string[];
  resolve(query: string, options?: ResolveOptions): Promise<ResolvedSequence>;
  search?(query: string, options?: SearchOptions): Promise<DatabaseSearchResult[]>;
}

export class SequenceProviderError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SequenceProviderError';
    this.code = code;
    this.details = details;
  }
}
