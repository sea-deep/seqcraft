import type { SequenceDocument } from '../domain/document';
import { useWorkspaceStore } from '../state/workspace-store';
import { deleteDocumentMetadata, saveDocumentMetadata } from '../storage/metadata-db';
import { opfsStorage } from '../storage/opfs-backend';
import FastaWorker from '../workers/fasta-importer.worker.ts?worker';

export interface ImportProgress {
  bytesRead: number;
  totalBytes: number;
  recordsIndexed: number;
}

type WorkerResponse =
  | { type: 'PROGRESS'; bytesRead: number; totalBytes: number; recordsIndexed: number }
  | { type: 'RECORD_STARTED'; id: string; name: string }
  | { type: 'RECORD_FINISHED'; id: string; name: string; length: number; alphabet: SequenceDocument['alphabet'] }
  | { type: 'DONE' }
  | { type: 'CANCELLED' }
  | { type: 'ERROR'; error: string };

export function importLargeFasta(
  file: File,
  onProgress: (progress: ImportProgress) => void,
  onComplete: () => void,
  onError: (error: string) => void,
): () => void {
  const worker = new FastaWorker();
  const storageIds = new Set<string>();
  const documents = new Map<string, SequenceDocument>();
  const metadataWrites: Promise<void>[] = [];
  let settled = false;

  const cleanup = async () => {
    await Promise.all([...storageIds].flatMap(id => [
      opfsStorage.deleteSequence(id).catch(() => undefined),
      deleteDocumentMetadata(id).catch(() => undefined),
    ]));
  };
  const fail = async (message: string) => {
    if (settled) return;
    settled = true;
    worker.terminate();
    await cleanup();
    onError(message);
  };

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const data = event.data;
    if (data.type === 'PROGRESS') {
      onProgress(data);
    } else if (data.type === 'RECORD_STARTED') {
      storageIds.add(data.id);
    } else if (data.type === 'RECORD_FINISHED') {
      const document: SequenceDocument = {
        id: data.id, name: data.name, topology: 'linear', alphabet: data.alphabet,
        length: data.length, storageMode: 'chunked', storageRef: { backend: 'opfs', key: data.id },
        features: [], primers: [], source: 'fasta', version: 1, sequence: null,
      };
      documents.set(document.id, document);
      metadataWrites.push(saveDocumentMetadata(document));
    } else if (data.type === 'DONE') {
      void Promise.all(metadataWrites).then(() => {
        if (settled) return;
        useWorkspaceStore.getState().addDocuments([...documents.values()]);
        settled = true;
        worker.terminate();
        onComplete();
      }).catch(error => fail(error instanceof Error ? error.message : String(error)));
    } else if (data.type === 'ERROR') {
      void fail(data.error);
    } else if (data.type === 'CANCELLED') {
      void fail('Import cancelled.');
    }
  };
  worker.onerror = event => void fail(event.message || 'Large FASTA worker failed');
  worker.postMessage({ type: 'START_IMPORT', file, defaultName: file.name });

  return () => {
    if (settled) return;
    worker.postMessage({ type: 'CANCEL' });
    globalThis.setTimeout(() => void fail('Import cancelled.'), 1_000);
  };
}
