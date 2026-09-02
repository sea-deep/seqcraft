import { del, get, getMany, keys, set } from 'idb-keyval';
import type { SequenceDocument } from '../domain/document';
import { assertDocumentInvariant } from '../domain/document';
import type { Feature } from '../domain/feature';
import type { Primer } from '../domain/primer';
import { ScientificSequence } from '../scientific/nucleotide';

const META_PREFIX = 'doc-meta-';
export const DOCUMENT_DTO_VERSION = 1 as const;

export interface PersistedDocumentDTO {
  schemaVersion: typeof DOCUMENT_DTO_VERSION;
  id: string;
  name: string;
  topology: SequenceDocument['topology'];
  alphabet: SequenceDocument['alphabet'];
  features: Feature[];
  primers: Primer[];
  source: SequenceDocument['source'];
  version: number;
  length: number;
  storage:
    | { mode: 'memory'; sequence: string }
    | { mode: 'chunked'; backend: 'opfs'; key: string };
}

export function serializeDocument(document: SequenceDocument): PersistedDocumentDTO {
  assertDocumentInvariant(document);
  const storage: PersistedDocumentDTO['storage'] = document.storageMode === 'memory'
    ? { mode: 'memory', sequence: document.sequence!.raw }
    : { mode: 'chunked', backend: 'opfs', key: document.storageRef!.key };
  return {
    schemaVersion: DOCUMENT_DTO_VERSION,
    id: document.id,
    name: document.name,
    topology: document.topology,
    alphabet: document.alphabet,
    features: structuredClone(document.features),
    primers: structuredClone(document.primers),
    source: document.source,
    version: document.version,
    length: document.length,
    storage,
  };
}

export function hydrateDocument(dto: PersistedDocumentDTO): SequenceDocument {
  if (dto.schemaVersion !== DOCUMENT_DTO_VERSION) throw new Error(`Unsupported document metadata schema: ${String(dto.schemaVersion)}`);
  const common = {
    id: dto.id, name: dto.name, topology: dto.topology, alphabet: dto.alphabet,
    features: structuredClone(dto.features), primers: structuredClone(dto.primers),
    source: dto.source, version: dto.version, length: dto.length,
  };
  const document: SequenceDocument = dto.storage.mode === 'memory'
    ? { ...common, storageMode: 'memory', sequence: new ScientificSequence(dto.storage.sequence, dto.alphabet) }
    : { ...common, storageMode: 'chunked', sequence: null, storageRef: { backend: dto.storage.backend, key: dto.storage.key } };
  assertDocumentInvariant(document);
  return document;
}

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

export async function saveDocumentMetadata(document: SequenceDocument): Promise<void> {
  if (!hasIndexedDB()) return;
  await set(`${META_PREFIX}${document.id}`, serializeDocument(document));
}

export async function getDocumentMetadata(id: string): Promise<SequenceDocument | undefined> {
  if (!hasIndexedDB()) return undefined;
  const raw = await get<PersistedDocumentDTO>(`${META_PREFIX}${id}`);
  return raw ? hydrateDocument(raw) : undefined;
}

export async function deleteDocumentMetadata(id: string): Promise<void> {
  if (!hasIndexedDB()) return;
  await del(`${META_PREFIX}${id}`);
}

export async function listAllDocuments(): Promise<SequenceDocument[]> {
  if (!hasIndexedDB()) return [];
  const allKeys = await keys();
  const docKeys = allKeys.filter((key): key is string => typeof key === 'string' && key.startsWith(META_PREFIX));
  if (docKeys.length === 0) return [];
  const dtos = await getMany<PersistedDocumentDTO>(docKeys);
  const docs: SequenceDocument[] = [];
  for (const raw of dtos) {
    if (raw) {
      try {
        docs.push(hydrateDocument(raw));
      } catch (err) {
        console.warn('Failed to hydrate document from IndexedDB:', err);
      }
    }
  }
  return docs;
}

export async function clearAllDocumentMetadata(): Promise<void> {
  if (!hasIndexedDB()) return;
  const allKeys = await keys();
  const docKeys = allKeys.filter((key): key is string => typeof key === 'string' && key.startsWith(META_PREFIX));
  await Promise.all(docKeys.map(k => del(k)));
}
