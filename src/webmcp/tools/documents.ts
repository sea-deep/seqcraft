import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { generateId } from '../../utils/id';
import { ScientificSequence } from '../../scientific/nucleotide';
import { computeSequenceSha256 } from '../../utils/sequence-hash';
import { getMemorySequence } from '../../utils/document-utils';
import type { SequenceDocument } from '../../domain/document';
import { useWorkspaceStore } from '../../state/workspace-store';

export const seqcraftListDocumentsTool: SeqCraftToolDefinition = {
  name: 'seqcraft_list_documents',
  title: 'List Documents',
  description: 'List all sequence constructs/documents currently loaded in the SeqCraft workspace with their IDs, names, topologies, lengths in base pairs, and revision numbers.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (_input, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const ws = ctx.workspace;
    const documents = ws.documents.map(d => ({
      id: d.id,
      name: d.name,
      lengthBp: d.length,
      topology: d.topology,
      alphabet: d.alphabet,
      revision: d.version,
      featureCount: d.features.length,
      primerCount: (d.primers || []).length,
      isActive: d.id === ws.activeDocumentId
    }));
    return createSuccess({
      activeDocumentId: ws.activeDocumentId,
      documentCount: documents.length,
      documents
    });
  }
};

export const seqcraftGetActiveDocumentTool: SeqCraftToolDefinition = {
  name: 'seqcraft_get_active_document',
  title: 'Get Active Document',
  description: 'Retrieve summary details, topological properties, annotations count, primers count, and revision metadata for the active or specified document.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, returns active document.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: async (input: { documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('NO_ACTIVE_DOCUMENT', 'No document found.', 'Use seqcraft_list_documents to see open documents.');
    }

    const rawSeq = doc.sequence ? getMemorySequence(doc).raw : '';
    const hash = await computeSequenceSha256(rawSeq);
    const gcCount = (rawSeq.match(/[GCgc]/g) || []).length;
    const gcContent = rawSeq.length > 0 ? Math.round((gcCount / rawSeq.length) * 1000) / 10 : 0;

    return createSuccess({
      documentId: doc.id,
      name: doc.name,
      topology: doc.topology,
      alphabet: doc.alphabet,
      lengthBp: doc.length,
      gcContent,
      revision: doc.version,
      sequenceHash: hash,
      featuresCount: doc.features.length,
      primersCount: (doc.primers || []).length
    });
  }
};

export const seqcraftCreateDocumentTool: SeqCraftToolDefinition = {
  name: 'seqcraft_create_document',
  title: 'Create Document',
  description: 'Create a new sequence document in the SeqCraft workspace from a nucleotide string. Validates sequence alphabet (DNA/RNA IUPAC).',
  effectClass: 'document_metadata',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the new construct.'
      },
      sequence: {
        type: 'string',
        description: 'Nucleotide sequence (5′→3′). Supports IUPAC degenerate bases.'
      },
      alphabet: {
        type: 'string',
        enum: ['DNA', 'RNA'],
        description: 'Sequence alphabet (default: DNA).'
      },
      topology: {
        type: 'string',
        enum: ['linear', 'circular'],
        description: 'Molecule topology (default: circular).'
      }
    },
    required: ['name', 'sequence'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (input: { name: string; sequence: string; alphabet?: 'DNA' | 'RNA'; topology?: 'linear' | 'circular' }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const cleanSeq = input.sequence.replace(/\s+/g, '').toUpperCase();
    if (!cleanSeq) {
      return createError('EMPTY_SEQUENCE', 'Cannot create document with empty sequence.');
    }

    const alphabet = input.alphabet || 'DNA';
    const validRegex = alphabet === 'RNA' ? /^[ACGURYSWKMBDHVN]+$/i : /^[ACGTRYSWKMBDHVN]+$/i;
    if (!validRegex.test(cleanSeq)) {
      return createError('INVALID_SEQUENCE', `Sequence contains invalid characters for ${alphabet}. Only IUPAC nucleotides are permitted.`);
    }

    const docId = generateId();
    const topology = input.topology || 'circular';
    const newDoc: SequenceDocument = {
      id: docId,
      name: input.name.trim() || 'Untitled Construct',
      length: cleanSeq.length,
      topology,
      alphabet,
      sequence: new ScientificSequence(cleanSeq, alphabet),
      features: [],
      primers: [],
      source: 'raw',
      storageMode: 'memory',
      version: 1
    };

    ctx.workspace.addDocument(newDoc);
    const hash = await computeSequenceSha256(cleanSeq);

    return createSuccess({
      status: 'applied',
      documentId: newDoc.id,
      name: newDoc.name,
      lengthBp: newDoc.length,
      topology: newDoc.topology,
      alphabet: newDoc.alphabet,
      revision: 1,
      sequenceHash: hash
    });
  }
};

export const seqcraftDuplicateDocumentTool: SeqCraftToolDefinition = {
  name: 'seqcraft_duplicate_document',
  title: 'Duplicate Document',
  description: 'Create an independent, isolated working copy of an existing document. Useful for safe experimentation, staging edits without altering the original construct, and testing modifications.',
  effectClass: 'document_metadata',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document to duplicate. If omitted, duplicates the active document.'
      },
      newName: {
        type: 'string',
        description: 'Optional name for the new copy. Defaults to "<Original Name> (Copy)".'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (input: { documentId?: string; newName?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const sourceDoc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!sourceDoc) {
      return createError('DOCUMENT_NOT_FOUND', 'Source document not found for duplication.');
    }

    const rawSeq = sourceDoc.sequence ? getMemorySequence(sourceDoc).raw : '';
    const newId = generateId();
    const targetName = input.newName?.trim() || `${sourceDoc.name} (Copy)`;

    // Deep clone features and primers with fresh IDs
    const clonedFeatures = sourceDoc.features.map(f => ({
      ...f,
      id: generateId(),
      qualifiers: { ...(f.qualifiers || {}) }
    }));
    const clonedPrimers = (sourceDoc.primers || []).map(p => ({
      ...p,
      id: generateId()
    }));

    const copyDoc: SequenceDocument = {
      ...sourceDoc,
      id: newId,
      name: targetName,
      sequence: new ScientificSequence(rawSeq, sourceDoc.alphabet),
      features: clonedFeatures,
      primers: clonedPrimers,
      version: 1
    };

    ctx.workspace.addDocument(copyDoc);
    const hash = await computeSequenceSha256(rawSeq);

    return createSuccess({
      status: 'applied',
      sourceDocumentId: sourceDoc.id,
      newDocumentId: copyDoc.id,
      name: copyDoc.name,
      lengthBp: copyDoc.length,
      topology: copyDoc.topology,
      revision: 1,
      sequenceHash: hash
    });
  }
};

export const seqcraftUpdateDocumentMetadataTool: SeqCraftToolDefinition = {
  name: 'seqcraft_update_document_metadata',
  title: 'Update Document Metadata',
  description: 'Update metadata for a document, such as renaming it or changing its topology (linear <-> circular).',
  effectClass: 'document_metadata',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, updates the active document.'
      },
      name: {
        type: 'string',
        description: 'New document name.'
      },
      topology: {
        type: 'string',
        enum: ['linear', 'circular'],
        description: 'New molecule topology.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (input: { documentId?: string; name?: string; topology?: 'linear' | 'circular' }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const revBefore = doc.version;
    const rawSeq = doc.sequence ? getMemorySequence(doc).raw : '';
    const hashBefore = await computeSequenceSha256(rawSeq);

    if (input.name && input.name.trim()) {
      ctx.workspace.renameDocument(doc.id, input.name.trim());
    }
    if (input.topology && input.topology !== doc.topology) {
      ctx.workspace.setDocumentTopology(doc.id, input.topology);
    }

    const updatedDoc = useWorkspaceStore.getState().documents.find(d => d.id === doc.id);

    return createSuccess({
      status: 'applied',
      documentId: doc.id,
      name: updatedDoc?.name || doc.name,
      topology: updatedDoc?.topology || doc.topology,
      revision: {
        before: revBefore,
        after: updatedDoc?.version || revBefore + 1
      },
      sequenceHash: {
        before: hashBefore,
        after: hashBefore
      }
    });
  }
};

export const seqcraftDeleteDocumentTool: SeqCraftToolDefinition = {
  name: 'seqcraft_delete_document',
  title: 'Delete Document',
  description: 'Remove a document from the SeqCraft workspace. To prevent accidental deletion during exploration, you must explicitly set confirmDelete: true.',
  effectClass: 'document_destructive',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Identifier of the document to remove.'
      },
      confirmDelete: {
        type: 'boolean',
        description: 'Must be explicitly set to true to confirm deletion.'
      }
    },
    required: ['documentId', 'confirmDelete'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (input: { documentId: string; confirmDelete: boolean }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    if (!input.confirmDelete) {
      return createError('CONFIRMATION_REQUIRED', 'Document deletion requires confirmDelete: true parameter to prevent accidental loss.', 'Pass confirmDelete: true if you intentionally wish to remove the construct.');
    }

    const doc = ctx.workspace.documents.find(d => d.id === input.documentId);
    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', `Document ID '${input.documentId}' not found.`);
    }

    ctx.workspace.removeDocument(input.documentId);
    const newActive = ctx.workspace.activeDocumentId;

    return createSuccess({
      status: 'applied',
      deletedDocumentId: input.documentId,
      deletedDocumentName: doc.name,
      newActiveDocumentId: newActive
    });
  }
};

export const documentTools: SeqCraftToolDefinition[] = [
  seqcraftListDocumentsTool,
  seqcraftGetActiveDocumentTool,
  seqcraftCreateDocumentTool,
  seqcraftDuplicateDocumentTool,
  seqcraftUpdateDocumentMetadataTool,
  seqcraftDeleteDocumentTool
];
