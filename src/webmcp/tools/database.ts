import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { sequenceProviders } from '../../services/providers/registry';
import { SequenceProviderError } from '../../services/providers/types';
import { importDatabaseSequence } from '../../workflows/fetch-database-sequence';
import { useWorkspaceStore } from '../../state/workspace-store';

export const seqcraftSearchSequenceDatabaseTool: SeqCraftToolDefinition = {
  name: 'seqcraft_search_sequence_database',
  title: 'Search Sequence Database',
  description: 'Search public biological sequence databases (NCBI Nucleotide / GenBank, RefSeq, ENA / EMBL-EBI, Addgene) for accession IDs, plasmid constructs, genes, or genomes matching a query. Returns compact candidate records with accession, title, organism, length in bp, and molecule type.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        description: "Target database provider: 'ncbi' (GenBank/RefSeq), 'ena' (EMBL-EBI), or 'addgene'. Defaults to 'ncbi'.",
        default: 'ncbi'
      },
      query: {
        type: 'string',
        description: "Search term, organism, plasmid name, gene symbol, or keyword (e.g. 'pBR322', 'eGFP', 'lambda phage', 'cas9')."
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of candidate records to return (1-20). Defaults to 5.',
        default: 5
      }
    },
    required: ['query']
  },
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: false
  },
  execute: async (input: { provider?: string; query: string; limit?: number }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();

    const providerId = input.provider || 'ncbi';
    const provider = sequenceProviders.get(providerId);

    if (!provider) {
      return createError(
        'UNKNOWN_PROVIDER',
        `Unknown sequence database provider '${providerId}'.`,
        `Available providers: ${sequenceProviders.list().map(p => p.id).join(', ')}`
      );
    }

    if (!input.query || !input.query.trim()) {
      return createError('INVALID_INPUT', 'Search query cannot be empty.');
    }

    try {
      if (!provider.search) {
        return createError(
          'SEARCH_NOT_SUPPORTED',
          `Provider '${provider.id}' does not support keyword search. Please query directly by accession ID.`
        );
      }

      const results = await provider.search(input.query.trim(), {
        limit: input.limit ?? 5,
        signal: ctx.signal
      });

      return createSuccess({
        provider: provider.id,
        query: input.query.trim(),
        totalMatches: results.length,
        results
      });
    } catch (err: any) {
      if (err instanceof SequenceProviderError) {
        return createError(err.code, err.message);
      }
      return createError('SEARCH_FAILED', `Failed to execute search: ${err.message}`);
    }
  }
};

export const seqcraftImportFromDatabaseTool: SeqCraftToolDefinition = {
  name: 'seqcraft_import_from_database',
  title: 'Import Sequence from Database',
  description: 'Fetch and import an authoritative biological sequence from a public repository (NCBI Nucleotide / GenBank, RefSeq, ENA, Addgene) by accession ID into the SeqCraft workspace. Use this tool whenever the user references a known public accession (e.g. J01749.1, NC_001416.1, OQ870305.1) or asks SeqCraft to obtain a biological sequence from a public repository. Preserves sequence topology, GenBank annotations, and origin metadata.',
  effectClass: 'workspace_ephemeral',
  inputSchema: {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        description: "Target database provider: 'ncbi' (default), 'ena', or 'addgene'.",
        default: 'ncbi'
      },
      accession: {
        type: 'string',
        description: "Authoritative accession or version ID (e.g. 'J01749.1', 'NC_001416.1', 'OQ870305.1', '12260')."
      },
      format: {
        type: 'string',
        enum: ['genbank', 'fasta'],
        description: "Format preference: 'genbank' (default, preserves annotations and features) or 'fasta'.",
        default: 'genbank'
      },
      openAfterImport: {
        type: 'boolean',
        description: 'Whether to activate and open the imported document in the workspace immediately. Defaults to true.',
        default: true
      }
    },
    required: ['accession']
  },
  annotations: {
    readOnlyHint: false,
    untrustedContentHint: true
  },
  execute: async (input: { provider?: string; accession: string; format?: 'genbank' | 'fasta'; openAfterImport?: boolean }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();

    const providerId = input.provider || 'ncbi';
    const provider = sequenceProviders.get(providerId);

    if (!provider) {
      return createError(
        'UNKNOWN_PROVIDER',
        `Unknown sequence database provider '${providerId}'.`,
        `Available providers: ${sequenceProviders.list().map(p => p.id).join(', ')}`
      );
    }

    const cleanAccession = input.accession?.trim();
    if (!cleanAccession) {
      return createError('INVALID_INPUT', 'Accession ID cannot be empty.');
    }

    try {
      const result = await importDatabaseSequence(providerId, cleanAccession, {
        format: input.format || 'genbank',
        openAfterImport: input.openAfterImport !== false,
        signal: ctx.signal
      });

      // Sample post-commit state directly from Zustand store
      const committedState = useWorkspaceStore.getState();

      return createSuccess({
        status: 'imported',
        documentId: result.documentId,
        name: result.name,
        accession: result.accession,
        lengthBp: result.lengthBp,
        topology: result.topology,
        featureCount: result.featureCount,
        activeDocumentId: committedState.activeDocumentId ?? result.documentId
      });
    } catch (err: any) {
      if (err instanceof SequenceProviderError) {
        return createError(err.code, err.message, err.details as any);
      }
      return createError('IMPORT_FAILED', `Failed to import from ${provider.name}: ${err.message}`);
    }
  }
};

export const databaseTools: SeqCraftToolDefinition[] = [
  seqcraftSearchSequenceDatabaseTool,
  seqcraftImportFromDatabaseTool
];
