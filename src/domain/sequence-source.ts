export interface SequenceSource {
  readonly length: number;
  
  getRange(start0: number, end0Exclusive: number): Promise<string>;
  
  streamRange?(start0: number, end0Exclusive: number): ReadableStream<Uint8Array>;
  
  getAll?(): Promise<string>;
}

export class MemorySequenceSource implements SequenceSource {
  private sequence: string;

  constructor(sequence: string) {
    this.sequence = sequence;
  }

  get length(): number {
    return this.sequence.length;
  }

  get raw(): string {
    return this.sequence;
  }

  async getRange(start0: number, end0Exclusive: number): Promise<string> {
    return this.sequence.substring(start0, end0Exclusive);
  }

  async getAll(): Promise<string> {
    return this.sequence;
  }
}

export class ChunkedSequenceSource implements SequenceSource {
  private sequenceId: string;
  private sequenceLength: number;
  private readRangeFn: (id: string, start: number, end: number) => Promise<string>;

  constructor(
    sequenceId: string,
    sequenceLength: number,
    readRangeFn: (id: string, start: number, end: number) => Promise<string>
  ) {
    this.sequenceId = sequenceId;
    this.sequenceLength = sequenceLength;
    this.readRangeFn = readRangeFn;
  }

  get length(): number {
    return this.sequenceLength;
  }

  async getRange(start0: number, end0Exclusive: number): Promise<string> {
    const validStart = Math.max(0, start0);
    const validEnd = Math.min(this.sequenceLength, end0Exclusive);
    return await this.readRangeFn(this.sequenceId, validStart, validEnd);
  }

  async getAll(): Promise<string> {
    return await this.getRange(0, this.length);
  }
}
