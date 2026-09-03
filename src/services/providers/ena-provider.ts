import type { DatabaseSearchResult, ResolveOptions, ResolvedSequence, SearchOptions, SequenceProvider } from './types';
import { SequenceProviderError } from './types';

export class EnaSequenceProvider implements SequenceProvider {
  id = 'ena';
  name = 'ENA / EMBL-EBI';
  description = 'European Nucleotide Archive (EMBL European Bioinformatics Institute).';
  exampleAccessions = ['J01749.1', 'V00181', 'AE000111'];

  async resolve(query: string, options?: ResolveOptions): Promise<ResolvedSequence> {
    const cleanId = query.trim();
    if (!cleanId) {
      throw new SequenceProviderError('UNKNOWN_ACCESSION', 'Accession ID cannot be empty.');
    }

    // Try FASTA endpoint from ENA browser API
    const url = `https://www.ebi.ac.uk/ena/browser/api/fasta/${encodeURIComponent(cleanId)}`;

    let response: Response;
    try {
      response = await fetch(url, { signal: options?.signal });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new SequenceProviderError('OPERATION_ABORTED', 'Request was cancelled.');
      }
      throw new SequenceProviderError('FETCH_FAILED', `Failed to connect to ENA Browser API: ${err.message}`);
    }

    if (response.status === 404) {
      throw new SequenceProviderError('UNKNOWN_ACCESSION', `ENA could not find accession '${cleanId}'.`);
    }

    if (!response.ok) {
      throw new SequenceProviderError('FETCH_FAILED', `ENA returned HTTP ${response.status}: ${response.statusText}`);
    }

    const rawText = await response.text();
    if (!rawText.trim() || !rawText.trim().startsWith('>')) {
      throw new SequenceProviderError('MALFORMED_RECORD', `ENA did not return a valid sequence for '${cleanId}'.`);
    }

    const lines = rawText.split(/\r?\n/);
    const header = lines[0].replace(/^>\s*/, '').trim();
    let lengthBp = 0;
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l && !l.startsWith('>')) {
        lengthBp += l.length;
      }
    }

    return {
      accession: cleanId,
      name: cleanId,
      rawText,
      format: 'fasta',
      provider: 'ena',
      sourceUrl: `https://www.ebi.ac.uk/ena/browser/view/${cleanId}`,
      definition: header,
      lengthBp,
      topology: 'linear',
      featureCount: 0
    };
  }

  async search(query: string, options?: SearchOptions): Promise<DatabaseSearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const limit = Math.min(Math.max(options?.limit ?? 5, 1), 20);
    const url = `https://www.ebi.ac.uk/ena/portal/api/search?result=sequence&query=accession=%22${encodeURIComponent(cleanQuery)}%22%20OR%20description=%22*${encodeURIComponent(cleanQuery)}*%22&format=json&limit=${limit}`;

    let response: Response;
    try {
      response = await fetch(url, { signal: options?.signal });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new SequenceProviderError('OPERATION_ABORTED', 'Search was cancelled.');
      }
      return [];
    }

    if (!response.ok) return [];

    try {
      const data = await response.json();
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        accession: item.accession || cleanQuery,
        title: item.description || item.accession,
        organism: item.scientific_name || undefined,
        lengthBp: typeof item.base_count === 'number' ? item.base_count : undefined,
        moleculeType: item.molecule_type || 'dna',
        topology: item.topology === 'circular' ? 'circular' : 'linear',
        provider: 'ena',
        sourceUrl: `https://www.ebi.ac.uk/ena/browser/view/${item.accession}`
      }));
    } catch {
      return [];
    }
  }
}
