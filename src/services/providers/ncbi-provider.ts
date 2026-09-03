import type { DatabaseSearchResult, ResolveOptions, ResolvedSequence, SearchOptions, SequenceProvider } from './types';
import { SequenceProviderError } from './types';

export class NcbiSequenceProvider implements SequenceProvider {
  id = 'ncbi';
  name = 'NCBI Nucleotide / GenBank';
  description = 'NCBI Entrez Nucleotide (GenBank & RefSeq) public sequence database.';
  exampleAccessions = ['J01749.1', 'OQ870305.1', 'NC_001416.1', 'NM_000546.6'];

  async resolve(query: string, options?: ResolveOptions): Promise<ResolvedSequence> {
    const cleanId = query.trim();
    if (!cleanId) {
      throw new SequenceProviderError('UNKNOWN_ACCESSION', 'Accession ID cannot be empty.');
    }

    const format = options?.format || 'genbank';
    const rettype = format === 'fasta' ? 'fasta' : 'gbwithparts';
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=${encodeURIComponent(cleanId)}&rettype=${rettype}&retmode=text`;

    let response: Response;
    try {
      response = await fetch(url, {
        signal: options?.signal,
        headers: {
          'Accept': 'text/plain'
        }
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new SequenceProviderError('OPERATION_ABORTED', 'Request was cancelled.');
      }
      throw new SequenceProviderError('FETCH_FAILED', `Failed to connect to NCBI eUtils: ${err.message}`);
    }

    if (response.status === 429) {
      throw new SequenceProviderError('RATE_LIMITED', 'NCBI request limit exceeded (max 3 req/sec). Please wait a moment and retry.');
    }

    if (!response.ok) {
      throw new SequenceProviderError('FETCH_FAILED', `NCBI returned HTTP ${response.status}: ${response.statusText}`);
    }

    const rawText = await response.text();
    const strippedError = rawText.replace(/\s+/g, '').toLowerCase();

    if (
      strippedError.includes('failedtounderstandid') ||
      strippedError.includes('idnotfound') ||
      strippedError.includes('cannotgetid') ||
      strippedError.includes('nosequencefound') ||
      strippedError.includes('emptyresult')
    ) {
      throw new SequenceProviderError(
        'UNKNOWN_ACCESSION',
        `NCBI Nucleotide could not find accession '${cleanId}'. Please check for typos (e.g. 'J01749.1' or 'NC_001416.1').`
      );
    }

    if (rawText.startsWith('Error:')) {
      throw new SequenceProviderError('FETCH_FAILED', `NCBI returned an error: ${rawText.trim()}`);
    }

    // Check for amino acid / protein records
    if (/LOCUS\s+\S+\s+\d+\s+aa\b/i.test(rawText)) {
      throw new SequenceProviderError(
        'UNSUPPORTED_MOLECULE_TYPE',
        `Accession '${cleanId}' is an amino acid / protein sequence. SeqCraft only supports nucleotide (DNA/RNA) sequences.`
      );
    }

    if (format === 'genbank') {
      if (!rawText.trim().startsWith('LOCUS')) {
        throw new SequenceProviderError(
          'MALFORMED_RECORD',
          `NCBI returned an invalid GenBank response for '${cleanId}'. Expected record to begin with 'LOCUS'.`
        );
      }

      return parseNcbiGenBankRecord(cleanId, rawText);
    } else {
      if (!rawText.trim().startsWith('>')) {
        throw new SequenceProviderError(
          'MALFORMED_RECORD',
          `NCBI returned an invalid FASTA response for '${cleanId}'. Expected header line starting with '>'.`
        );
      }

      return parseNcbiFastaRecord(cleanId, rawText);
    }
  }

  async search(query: string, options?: SearchOptions): Promise<DatabaseSearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const limit = Math.min(Math.max(options?.limit ?? 5, 1), 20);
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=nuccore&term=${encodeURIComponent(cleanQuery)}&retmode=json&retmax=${limit}`;

    let searchResp: Response;
    try {
      searchResp = await fetch(searchUrl, { signal: options?.signal });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new SequenceProviderError('OPERATION_ABORTED', 'Search was cancelled.');
      }
      throw new SequenceProviderError('FETCH_FAILED', `Failed to execute search on NCBI: ${err.message}`);
    }

    if (!searchResp.ok) {
      throw new SequenceProviderError('FETCH_FAILED', `NCBI search returned HTTP ${searchResp.status}`);
    }

    const searchData = await searchResp.json();
    const ids: string[] = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=nuccore&id=${ids.join(',')}&retmode=json`;
    let summaryResp: Response;
    try {
      summaryResp = await fetch(summaryUrl, { signal: options?.signal });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new SequenceProviderError('OPERATION_ABORTED', 'Summary request was cancelled.');
      }
      throw new SequenceProviderError('FETCH_FAILED', `Failed to fetch record summaries from NCBI: ${err.message}`);
    }

    if (!summaryResp.ok) return [];

    const summaryData = await summaryResp.json();
    const resultDict = summaryData?.result || {};

    const results: DatabaseSearchResult[] = [];
    for (const uid of ids) {
      const item = resultDict[uid];
      if (!item || typeof item !== 'object') continue;

      const accession = item.accessionversion || item.caption || uid;
      const title = item.title || item.extra || accession;
      const organism = item.organism || undefined;
      const lengthBp = typeof item.slen === 'number' ? item.slen : undefined;
      const moleculeType = item.moltype || item.biomol || 'dna';
      const topology = item.topology === 'circular' ? 'circular' : 'linear';

      results.push({
        accession,
        title,
        organism,
        lengthBp,
        moleculeType,
        topology,
        provider: 'ncbi',
        sourceUrl: `https://www.ncbi.nlm.nih.gov/nuccore/${accession}`
      });
    }

    return results;
  }
}

function parseNcbiGenBankRecord(accession: string, rawText: string): ResolvedSequence {
  const lines = rawText.split(/\r?\n/);
  const locusLine = lines.find(l => l.startsWith('LOCUS')) || '';

  // Parse length and topology from LOCUS
  // Example: LOCUS SYNPBR322 4361 bp DNA circular SYN 30-SEP-2008
  const lengthMatch = locusLine.match(/\b(\d+)\s+bp\b/i);
  const lengthBp = lengthMatch ? parseInt(lengthMatch[1], 10) : undefined;
  const isCircular = /\bcircular\b/i.test(locusLine);
  const topology: 'linear' | 'circular' = isCircular ? 'circular' : 'linear';

  // Parse DEFINITION
  let definition: string | undefined;
  const defIndex = lines.findIndex(l => l.startsWith('DEFINITION'));
  if (defIndex !== -1) {
    const defParts: string[] = [];
    for (let i = defIndex; i < lines.length; i++) {
      const line = lines[i];
      if (i === defIndex) {
        defParts.push(line.replace(/^DEFINITION\s+/, '').trim());
      } else if (/^[A-Z]/.test(line)) {
        break; // Reached next top-level keyword
      } else {
        defParts.push(line.trim());
      }
    }
    definition = defParts.join(' ').replace(/\.$/, '');
  }

  // Parse ORGANISM
  let organism: string | undefined;
  const orgLine = lines.find(l => /^\s+ORGANISM\s+/.test(l));
  if (orgLine) {
    organism = orgLine.replace(/^\s+ORGANISM\s+/, '').trim();
  }

  // Derive human-readable construct name
  let name = accession;
  if (definition) {
    // If definition mentions "Cloning vector pBR322", extract "pBR322"
    const vectorMatch = definition.match(/(?:vector|plasmid)\s+([A-Za-z0-9_+-]+)/i);
    if (vectorMatch && vectorMatch[1]) {
      name = vectorMatch[1];
    } else if (definition.length <= 40) {
      name = definition;
    } else {
      name = definition.slice(0, 37) + '...';
    }
  }

  // Estimate feature count
  let featureCount = 0;
  let inFeatures = false;
  for (const line of lines) {
    if (line.startsWith('FEATURES')) {
      inFeatures = true;
      continue;
    }
    if (line.startsWith('ORIGIN') || line.startsWith('BASE COUNT')) {
      break;
    }
    if (inFeatures && /^ {5}[a-zA-Z_]/.test(line)) {
      featureCount++;
    }
  }

  return {
    accession,
    name,
    rawText,
    format: 'genbank',
    provider: 'ncbi',
    sourceUrl: `https://www.ncbi.nlm.nih.gov/nuccore/${accession}`,
    definition,
    organism,
    lengthBp,
    topology,
    featureCount
  };
}

function parseNcbiFastaRecord(accession: string, rawText: string): ResolvedSequence {
  const lines = rawText.split(/\r?\n/);
  const headerLine = lines[0] || '';
  const title = headerLine.replace(/^>\s*/, '').trim();

  let lengthBp = 0;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l && !l.startsWith('>')) {
      lengthBp += l.length;
    }
  }

  return {
    accession,
    name: accession,
    rawText,
    format: 'fasta',
    provider: 'ncbi',
    sourceUrl: `https://www.ncbi.nlm.nih.gov/nuccore/${accession}`,
    definition: title,
    lengthBp,
    topology: 'linear',
    featureCount: 0
  };
}
