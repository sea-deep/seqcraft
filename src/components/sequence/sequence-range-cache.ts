export interface SequenceRange {
  documentId: string;
  start: number;
  end: number;
  sequence: string;
}

export type SequenceRangeReader = (documentId: string, start: number, end: number) => Promise<string>;

export class SequenceRangeCache {
  private readonly entries = new Map<string, SequenceRange>();
  private readonly maxEntries: number;

  constructor(maxEntries = 8) {
    this.maxEntries = maxEntries;
  }

  find(documentId: string, start: number, end: number): SequenceRange | undefined {
    for (const [key, entry] of this.entries) {
      if (entry.documentId === documentId && entry.start <= start && entry.end >= end) {
        this.entries.delete(key);
        this.entries.set(key, entry);
        return entry;
      }
    }
    return undefined;
  }

  async load(documentId: string, start: number, end: number, reader: SequenceRangeReader): Promise<SequenceRange> {
    const cached = this.find(documentId, start, end);
    if (cached) return cached;
    const sequence = await reader(documentId, start, end);
    if (sequence.length !== end - start) {
      throw new Error(`Range read for ${documentId} returned ${sequence.length} bases; expected ${end - start}`);
    }
    const range = { documentId, start, end, sequence };
    const key = `${documentId}:${start}:${end}`;
    this.entries.set(key, range);
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
    return range;
  }

  clear(): void {
    this.entries.clear();
  }
}

export class LatestRangeRequest {
  private generation = 0;

  begin(): number {
    return ++this.generation;
  }

  isCurrent(generation: number): boolean {
    return generation === this.generation;
  }

  invalidate(): void {
    this.generation++;
  }
}
