import { sequenceProviders } from '../services/providers/registry';
import type { ResolveOptions, ResolvedSequence } from '../services/providers/types';
import { importDocument } from '../import/normalize-document';
import type { SequenceDocument, DocumentProvenance } from '../domain/document';
import { useWorkspaceStore } from '../state/workspace-store';

export interface DatabaseSequencePreview {
  resolved: ResolvedSequence;
  previewDoc: SequenceDocument;
  documents: SequenceDocument[];
}

export interface DatabaseImportResult {
  status: 'imported';
  documentId: string;
  name: string;
  accession: string;
  lengthBp: number;
  topology: 'linear' | 'circular';
  featureCount: number;
  activeDocumentId: string;
  documents: SequenceDocument[];
}

/**
 * Resolves and parses a sequence from a public database for inspection/previewing
 * without modifying the active workspace state.
 */
export async function previewDatabaseSequence(
  providerId: string,
  accession: string,
  options?: ResolveOptions
): Promise<DatabaseSequencePreview> {
  const resolved = await sequenceProviders.resolveWithCache(providerId, accession, options);
  const docs = importDocument(resolved.rawText, resolved.name);

  if (docs.length === 0) {
    throw new Error(`Failed to parse sequence record returned from ${resolved.provider}.`);
  }

  const provenance: DocumentProvenance = {
    provider: resolved.provider,
    accession: resolved.accession,
    fetchedAt: new Date().toISOString(),
    sourceUrl: resolved.sourceUrl,
    definition: resolved.definition,
    organism: resolved.organism,
    format: resolved.format
  };

  for (const doc of docs) {
    if (resolved.name && (doc.name.startsWith('SYN') || doc.name === resolved.accession || doc.name === 'GenBank Sequence')) {
      doc.name = resolved.name;
    }
    doc.source = 'database';
    doc.provenance = provenance;
  }

  return {
    resolved,
    previewDoc: docs[0],
    documents: docs
  };
}

/**
 * Resolves, parses, and commits a sequence from a public database into the SeqCraft workspace.
 */
export async function importDatabaseSequence(
  providerId: string,
  accession: string,
  options?: {
    format?: 'genbank' | 'fasta';
    openAfterImport?: boolean;
    signal?: AbortSignal;
  }
): Promise<DatabaseImportResult> {
  const { resolved, previewDoc, documents } = await previewDatabaseSequence(providerId, accession, {
    format: options?.format,
    signal: options?.signal
  });

  const workspace = useWorkspaceStore.getState();
  workspace.addDocuments(documents);

  const shouldOpen = options?.openAfterImport !== false;
  if (shouldOpen) {
    useWorkspaceStore.getState().setActiveDocument(previewDoc.id);
  }

  // Read committed state directly from store post-update
  const committedState = useWorkspaceStore.getState();

  return {
    status: 'imported',
    documentId: previewDoc.id,
    name: previewDoc.name,
    accession: resolved.accession,
    lengthBp: previewDoc.length,
    topology: previewDoc.topology,
    featureCount: previewDoc.features.length,
    activeDocumentId: committedState.activeDocumentId ?? previewDoc.id,
    documents
  };
}
