import type { SequenceDocument } from '../domain/document';

export interface FastaStreamRecord {
  id: string;
  name: string;
  length: number;
  alphabet: SequenceDocument['alphabet'];
}

export interface FastaStreamSink {
  startRecord(id: string, name: string): Promise<void>;
  writeSequence(sequence: string): Promise<void>;
  finishRecord(record: FastaStreamRecord): Promise<void>;
}

export interface ParseFastaStreamOptions {
  defaultName: string;
  createId: () => string;
  isCancelled?: () => boolean;
  onBytesRead?: (bytesRead: number, recordsFinished: number) => void;
}

export async function parseFastaStream(
  chunks: AsyncIterable<Uint8Array>,
  sink: FastaStreamSink,
  options: ParseFastaStreamOptions,
): Promise<number> {
  const decoder = new TextDecoder();
  let partialLine = '';
  let current: { id: string; name: string; length: number; hasT: boolean; hasU: boolean } | undefined;
  let bytesRead = 0;
  let recordsFinished = 0;

  const ensureActive = () => {
    if (options.isCancelled?.()) throw new DOMException('Import cancelled', 'AbortError');
  };
  const startRecord = async (name: string) => {
    const id = options.createId();
    current = { id, name: name || `${options.defaultName} ${recordsFinished + 1}`, length: 0, hasT: false, hasU: false };
    await sink.startRecord(id, current.name);
  };
  const finishRecord = async () => {
    if (!current) return;
    const record = current;
    current = undefined;
    if (record.length === 0) throw new Error(`FASTA record “${record.name}” has no sequence`);
    const alphabet = record.hasT && record.hasU ? 'MIXED' : record.hasT ? 'DNA' : record.hasU ? 'RNA' : 'UNKNOWN';
    await sink.finishRecord({ id: record.id, name: record.name, length: record.length, alphabet });
    recordsFinished++;
  };
  const processLine = async (line: string) => {
    ensureActive();
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('>')) {
      await finishRecord();
      await startRecord(trimmed.slice(1).trim());
      return;
    }
    if (!current) await startRecord(options.defaultName);
    const normalized = trimmed.replace(/\s+/g, '').toUpperCase();
    if (!/^[ACGTURYSWKMBDHVN.-]+$/.test(normalized)) throw new Error('Invalid nucleotide sequence: contains non-IUPAC characters.');
    current!.hasT ||= normalized.includes('T');
    current!.hasU ||= normalized.includes('U');
    current!.length += normalized.length;
    await sink.writeSequence(normalized);
  };

  for await (const chunk of chunks) {
    ensureActive();
    bytesRead += chunk.byteLength;
    const lines = (partialLine + decoder.decode(chunk, { stream: true })).split(/\r?\n/);
    partialLine = lines.pop() ?? '';
    for (const line of lines) await processLine(line);
    options.onBytesRead?.(bytesRead, recordsFinished);
  }
  partialLine += decoder.decode();
  if (partialLine) await processLine(partialLine);
  await finishRecord();
  return recordsFinished;
}
