const SEQUENCE_DIRECTORY = 'sequences';
const FILE_SUFFIX = '.seq';

export interface SequenceWriter {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

function validateStorageKey(key: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(key)) throw new Error(`Invalid OPFS sequence key: ${key}`);
}

export class OPFSBackend {
  private async getDirectory(): Promise<FileSystemDirectoryHandle> {
    if (!navigator.storage?.getDirectory) throw new Error('OPFS is not supported in this browser.');
    return navigator.storage.getDirectory();
  }

  private async getSequencesDir(create = true): Promise<FileSystemDirectoryHandle> {
    const root = await this.getDirectory();
    return root.getDirectoryHandle(SEQUENCE_DIRECTORY, { create });
  }

  async exists(key: string): Promise<boolean> {
    validateStorageKey(key);
    try {
      const dir = await this.getSequencesDir(false);
      await dir.getFileHandle(`${key}${FILE_SUFFIX}`);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') return false;
      throw error;
    }
  }

  async createSequenceWriter(key: string): Promise<SequenceWriter> {
    validateStorageKey(key);
    if (await this.exists(key)) throw new Error(`Sequence storage key ${key} already exists`);
    const dir = await this.getSequencesDir();
    const filename = `${key}${FILE_SUFFIX}`;
    const fileHandle = await dir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    let settled = false;
    return {
      write: async data => {
        if (settled) throw new Error('Cannot write to a closed sequence writer');
        await writable.write(new Uint8Array(data).buffer);
      },
      close: async () => {
        if (settled) return;
        settled = true;
        await writable.close();
      },
      abort: async () => {
        if (settled) return;
        settled = true;
        await writable.abort();
        try { await dir.removeEntry(filename); } catch (error) {
          if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error;
        }
      },
    };
  }

  async saveSequence(key: string, data: Uint8Array): Promise<void> {
    const writer = await this.createSequenceWriter(key);
    try {
      await writer.write(data);
      await writer.close();
    } catch (error) {
      await writer.abort().catch(() => undefined);
      throw error;
    }
  }

  async readSequenceRange(key: string, start: number, endExclusive: number): Promise<string> {
    validateStorageKey(key);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(endExclusive) || start < 0 || endExclusive < start) {
      throw new RangeError(`Invalid sequence range [${start}, ${endExclusive})`);
    }
    const dir = await this.getSequencesDir(false);
    const fileHandle = await dir.getFileHandle(`${key}${FILE_SUFFIX}`);
    const file = await fileHandle.getFile();
    if (endExclusive > file.size) throw new RangeError(`Sequence range ends at ${endExclusive}, beyond stored length ${file.size}`);
    return file.slice(start, endExclusive).text();
  }

  async getSequenceLength(key: string): Promise<number> {
    validateStorageKey(key);
    const dir = await this.getSequencesDir(false);
    const fileHandle = await dir.getFileHandle(`${key}${FILE_SUFFIX}`);
    return (await fileHandle.getFile()).size;
  }

  async deleteSequence(key: string): Promise<void> {
    validateStorageKey(key);
    try {
      const dir = await this.getSequencesDir(false);
      await dir.removeEntry(`${key}${FILE_SUFFIX}`);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error;
    }
  }
}

export const opfsStorage = new OPFSBackend();
