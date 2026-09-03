import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { importDocument } from '../../import/normalize-document';
import { serializeToGenBank, serializeToFasta, serializeToSeqCraft, EXPORT_FORMATS, type ExportFormat } from '../../export/export-document';
import { computeSequenceSha256 } from '../../utils/sequence-hash';
import { getMemorySequence } from '../../utils/document-utils';
import { useWorkspaceStore } from '../../state/workspace-store';

export const seqcraftImportSequenceTextTool: SeqCraftToolDefinition = {
  name: 'seqcraft_import_sequence_text',
  title: 'Import Sequence Text',
  description: 'Import DNA/RNA sequence data into SeqCraft from FASTA, GenBank flat file, or raw sequence text. Creates and opens the construct(s) in the workspace.',
  effectClass: 'document_metadata',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Sequence file content (FASTA, GenBank flat file, or raw sequence text).'
      },
      name: {
        type: 'string',
        description: 'Optional override name for raw sequence inputs.'
      }
    },
    required: ['content'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (input: { content: string; name?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const content = input.content || (input as any).text;
    if (!content || !content.trim()) {
      return createError('EMPTY_CONTENT', 'Import content cannot be empty.');
    }

    try {
      const docs = importDocument(content, input.name);
      if (docs.length === 0) {
        return createError('IMPORT_FAILED', 'Could not parse any sequence documents from provided content.');
      }

      ctx.workspace.addDocuments(docs);

      const imported = await Promise.all(
        docs.map(async d => {
          const raw = d.sequence ? getMemorySequence(d).raw : '';
          const hash = await computeSequenceSha256(raw);
          return {
            id: d.id,
            name: d.name,
            lengthBp: d.length,
            topology: d.topology,
            alphabet: d.alphabet,
            featureCount: d.features.length,
            primerCount: (d.primers || []).length,
            revision: d.version,
            sequenceHash: hash
          };
        })
      );

      const committedState = useWorkspaceStore.getState();
      return createSuccess({
        status: 'applied',
        importedCount: docs.length,
        activeDocumentId: committedState.activeDocumentId,
        documents: imported
      });
    } catch (err: any) {
      return createError('PARSE_ERROR', err.message || 'Failed to parse sequence.');
    }
  }
};

export const seqcraftExportDocumentTool: SeqCraftToolDefinition = {
  name: 'seqcraft_export_document',
  title: 'Export Document',
  description: 'Export the active or specified construct to standard bioinformatic formats: GenBank flat file (including all features and annotations), FASTA, or SeqCraft JSON format. Returns generated text, filename, revision, and sequence hash.',
  effectClass: 'export',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, exports the active document.'
      },
      format: {
        type: 'string',
        enum: EXPORT_FORMATS,
        description: 'Export format (default: genbank).'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: async (input: { documentId?: string; format?: ExportFormat }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const fmt = input.format || 'genbank';
    const raw = doc.sequence ? getMemorySequence(doc).raw : '';
    const hash = await computeSequenceSha256(raw);

    let content = '';
    let ext = 'gb';

    if (fmt === 'fasta') {
      content = serializeToFasta(doc);
      ext = 'fasta';
    } else if (fmt === 'seqcraft') {
      content = serializeToSeqCraft(doc);
      ext = 'json';
    } else {
      content = serializeToGenBank(doc);
      ext = 'gb';
    }

    const safeName = doc.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filename = `${safeName}.${ext}`;

    return createSuccess({
      format: fmt,
      documentId: doc.id,
      documentName: doc.name,
      revision: doc.version,
      sequenceHash: hash,
      lengthBp: doc.length,
      filename,
      content
    });
  }
};

export const seqcraftExportSequenceTool: SeqCraftToolDefinition = {
  ...seqcraftExportDocumentTool,
  name: 'seqcraft_export_sequence',
  title: 'Export Sequence'
};

export const ioTools: SeqCraftToolDefinition[] = [
  seqcraftImportSequenceTextTool,
  seqcraftExportDocumentTool,
  seqcraftExportSequenceTool
];

