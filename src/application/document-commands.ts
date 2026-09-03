/**
 * Application commands for sequence document lifecycle (create, delete, duplicate, metadata).
 * Shared between UI workflows and WebMCP tools.
 */

import { useWorkspaceStore } from '../state/workspace-store';
import { generateId } from '../utils/id';
import { ScientificSequence } from '../scientific/nucleotide';
import { inferAlphabet } from '../scientific/alphabet';
import { getMemorySequence } from '../utils/document-utils';
import type { SequenceDocument, Topology, Alphabet } from '../domain/document';
import { ERROR_CODES } from '../domain/errors';

export interface CreateDocumentInput {
  name: string;
  sequence: string;
  topology?: Topology;
  alphabet?: Alphabet;
}

export interface DocumentCommandResult {
  ok: boolean;
  document?: SequenceDocument;
  error?: string;
  code?: string;
}

export function createDocumentCommand(input: CreateDocumentInput): DocumentCommandResult {
  const store = useWorkspaceStore.getState();
  const rawSeq = (input.sequence || '').replace(/\s+/g, '').toUpperCase();
  if (rawSeq.length === 0) {
    return { ok: false, error: 'Sequence string cannot be empty.', code: ERROR_CODES.EMPTY_SEQUENCE };
  }

  const topology: Topology = input.topology || 'linear';
  let alphabet: Alphabet = input.alphabet || 'DNA';
  try {
    alphabet = inferAlphabet(rawSeq);
  } catch {
    // Retain default
  }

  const docId = generateId();
  const newDoc: SequenceDocument = {
    id: docId,
    name: input.name.trim() || `Construct_${docId.slice(0, 4)}`,
    topology,
    alphabet,
    length: rawSeq.length,
    storageMode: 'memory',
    sequence: new ScientificSequence(rawSeq, alphabet === 'RNA' ? 'RNA' : 'DNA'),
    features: [],
    primers: [],
    source: 'raw',
    version: 1
  };

  store.addDocument(newDoc);
  store.setActiveDocument(newDoc.id);

  return { ok: true, document: newDoc };
}

export function duplicateDocumentCommand(documentId?: string, newName?: string): DocumentCommandResult {
  const store = useWorkspaceStore.getState();
  const doc = documentId
    ? store.documents.find(d => d.id === documentId)
    : store.documents.find(d => d.id === store.activeDocumentId);

  if (!doc) {
    return { ok: false, error: 'Target document not found.', code: ERROR_CODES.DOCUMENT_NOT_FOUND };
  }

  const rawSeq = doc.sequence ? getMemorySequence(doc).raw : '';
  const newDocId = generateId();

  const dupDoc: SequenceDocument = {
    ...doc,
    id: newDocId,
    name: newName?.trim() || `${doc.name} (Copy)`,
    sequence: new ScientificSequence(rawSeq, doc.alphabet === 'RNA' ? 'RNA' : 'DNA'),
    features: doc.features.map(f => ({ ...f, id: generateId() })),
    primers: doc.primers.map(p => ({ ...p, id: generateId() })),
    version: 1
  };

  store.addDocument(dupDoc);
  store.setActiveDocument(dupDoc.id);

  return { ok: true, document: dupDoc };
}

export function deleteDocumentCommand(documentId: string): DocumentCommandResult {
  const store = useWorkspaceStore.getState();
  const doc = store.documents.find(d => d.id === documentId);
  if (!doc) {
    return { ok: false, error: 'Document not found.', code: ERROR_CODES.DOCUMENT_NOT_FOUND };
  }

  store.removeDocument(documentId);
  return { ok: true, document: doc };
}
