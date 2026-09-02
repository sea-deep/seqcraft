import type { SequenceDocument } from '../domain/document';
import { useWorkspaceStore } from '../state/workspace-store';
import { deleteDocumentMetadata, listAllDocuments, saveDocumentMetadata } from './metadata-db';
import { opfsStorage } from './opfs-backend';

let stopSubscription: (() => void) | undefined;

export function initializeDocumentPersistence(onError: (error: unknown) => void = console.error): () => void {
  if (stopSubscription) return stopSubscription;
  let previous = new Map(useWorkspaceStore.getState().documents.map(document => [document.id, document]));
  stopSubscription = useWorkspaceStore.subscribe(state => {
    const current = new Map(state.documents.map(document => [document.id, document]));
    for (const document of current.values()) {
      const old = previous.get(document.id);
      if (!old || old.version !== document.version) void saveDocumentMetadata(document).catch(onError);
    }
    for (const old of previous.values()) {
      if (current.has(old.id)) continue;
      void deletePersistedDocument(old).catch(onError);
    }
    previous = current;
  });
  return () => {
    stopSubscription?.();
    stopSubscription = undefined;
  };
}

export async function deletePersistedDocument(document: SequenceDocument): Promise<void> {
  await deleteDocumentMetadata(document.id);
  if (document.storageMode === 'chunked' && document.storageRef) {
    await opfsStorage.deleteSequence(document.storageRef.key);
  }
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
