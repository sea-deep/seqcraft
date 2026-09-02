/// <reference lib="webworker" />

import { parseFastaStream, type FastaStreamRecord, type FastaStreamSink } from '../import/fasta-stream';
import { OPFSBackend, type SequenceWriter } from '../storage/opfs-backend';
import { generateId } from '../utils/id';

type WorkerRequest = { type: 'START_IMPORT'; file: File; defaultName: string } | { type: 'CANCEL' };

const opfs = new OPFSBackend();
let cancelled = false;
let activeWriter: SequenceWriter | undefined;
let activeId: string | undefined;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === 'CANCEL') {
    cancelled = true;
    return;
  }
  cancelled = false;
  void processFastaStream(event.data.file, event.data.defaultName).catch(async error => {
    await activeWriter?.abort().catch(() => undefined);
    if (activeId) await opfs.deleteSequence(activeId).catch(() => undefined);
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    self.postMessage(aborted ? { type: 'CANCELLED' } : { type: 'ERROR', error: error instanceof Error ? error.message : String(error) });
  });
};

async function processFastaStream(file: File, defaultName: string): Promise<void> {
  let progressCounter = 0;
  const sink: FastaStreamSink = {
    async startRecord(id, name) {
      activeId = id;
      activeWriter = await opfs.createSequenceWriter(id);
      self.postMessage({ type: 'RECORD_STARTED', id, name });
    },
    async writeSequence(sequence) {
      if (!activeWriter) throw new Error('FASTA parser wrote sequence data without an active record');
      await activeWriter.write(new TextEncoder().encode(sequence));
    },
    async finishRecord(record: FastaStreamRecord) {
      if (!activeWriter || activeId !== record.id) throw new Error('FASTA record storage identity mismatch');
      await activeWriter.close();
      activeWriter = undefined;
      activeId = undefined;
      self.postMessage({ type: 'RECORD_FINISHED', ...record });
    },
  };
  await parseFastaStream(file.stream(), sink, {
    defaultName,
    createId: generateId,
    isCancelled: () => cancelled,
    onBytesRead(bytesRead, recordsIndexed) {
      if (++progressCounter % 10 === 0 || bytesRead === file.size) {
        self.postMessage({ type: 'PROGRESS', bytesRead, totalBytes: file.size, recordsIndexed });
      }
    },
  });
  self.postMessage({ type: 'DONE' });
}
