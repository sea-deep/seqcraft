import { Seq, type Alphabet } from 'nucleotide-sequence';
import type { SequenceSource } from '../domain/sequence-source';

export class ScientificSequence implements SequenceSource {
  private seq: Seq;
  public readonly alphabet: Alphabet;

  constructor(sequenceString: string, type: Alphabet = 'DNA') {
    this.seq = new Seq(type).read(sequenceString);
    this.alphabet = type;
  }

  get raw(): string {
    return this.seq.sequence();
  }

  get engineSeq() {
    return this.seq;
  }

  get length(): number {
    return this.seq.size();
  }

  async getRange(start0: number, end0Exclusive: number): Promise<string> {
    return this.raw.substring(start0, end0Exclusive);
  }

  async getAll(): Promise<string> {
    return this.raw;
  }
}
