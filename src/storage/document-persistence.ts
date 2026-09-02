import type { SequenceDocument } from '../domain/document';
import { useWorkspaceStore } from '../state/workspace-store';
import { deleteDocumentMetadata, listAllDocuments, saveDocumentMetadata, clearAllDocumentMetadata } from './metadata-db';
import { opfsStorage } from './opfs-backend';

let stopSubscription: (() => void) | undefined;
const SAVE_DEBOUNCE_MS = 500;

export function initializeDocumentPersistence(onError: (error: unknown) => void = console.error): () => void {
  if (stopSubscription) return stopSubscription;
  let previous = new Map(useWorkspaceStore.getState().documents.map(document => [document.id, document]));
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const queues = new Map<string, Promise<void>>();

  const enqueue = (id: string, operation: () => Promise<void>) => {
    const prior = queues.get(id) ?? Promise.resolve();
    const next = prior.catch(() => undefined).then(operation);
    queues.set(id, next);
    void next.catch(onError).finally(() => {
      if (queues.get(id) === next) queues.delete(id);
    });
  };

  stopSubscription = useWorkspaceStore.subscribe(state => {
    const current = new Map(state.documents.map(document => [document.id, document]));
    for (const document of current.values()) {
      const old = previous.get(document.id);
      if (!old || old.version !== document.version) {
        const existing = timers.get(document.id);
        if (existing) clearTimeout(existing);
        timers.set(document.id, setTimeout(() => {
          timers.delete(document.id);
          enqueue(document.id, () => saveDocumentMetadata(document));
        }, SAVE_DEBOUNCE_MS));
      }
    }
    for (const old of previous.values()) {
      if (current.has(old.id)) continue;
      const pending = timers.get(old.id);
      if (pending) clearTimeout(pending);
      timers.delete(old.id);
      enqueue(old.id, () => deletePersistedDocument(old));
    }
    previous = current;
  });

  return () => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    stopSubscription?.();
    stopSubscription = undefined;
  };
}

export async function deletePersistedDocument(document: SequenceDocument): Promise<void> {
  // Delete OPFS file handle first to prevent orphaned disk files if metadata deletion precedes it
  if (document.storageMode === 'chunked' && document.storageRef) {
    try {
      await opfsStorage.deleteSequence(document.storageRef.key);
    } catch (err) {
      console.warn(`Failed to delete OPFS sequence for ${document.id}:`, err);
    }
  }
  await deleteDocumentMetadata(document.id);
}

export async function clearAllWorkspaceStorage(): Promise<void> {
  await clearAllDocumentMetadata();
  await opfsStorage.clearAllSequences();
}

export async function loadPersistedDocuments(onRecoveryIssue: (message: string) => void = console.warn): Promise<SequenceDocument[]> {
  const documents = await listAllDocuments();
  const available: SequenceDocument[] = [];
  for (const document of documents) {
    if (document.storageMode === 'memory') {
      available.push(document);
      continue;
    }
    const key = document.storageRef!.key;
    const valid = await opfsStorage.exists(key) && await opfsStorage.getSequenceLength(key) === document.length;
    if (valid) available.push(document);
    else {
      onRecoveryIssue(`Removed stale metadata for ${document.name}: its OPFS sequence is missing or incomplete.`);
      await deleteDocumentMetadata(document.id);
    }
  }
  return available;
}

let hydrationPromise: Promise<SequenceDocument[]> | null = null;

export async function hydrateWorkspaceFromStorage(): Promise<SequenceDocument[]> {
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      const docs = await loadPersistedDocuments();
      if (docs.length > 0) {
        const state = useWorkspaceStore.getState();
        const existingIds = new Set(state.documents.map(d => d.id));
        const newDocs = docs.filter(d => !existingIds.has(d.id));
        if (newDocs.length > 0) {
          state.addDocuments(newDocs);
        }
      }
      return docs;
    } finally {
      useWorkspaceStore.getState().setIsHydrated(true);
    }
  })();
  return hydrationPromise;
}
