import { Seq, type Alphabet } from 'nucleotide-sequence';

/**
 * Application-owned wrapper around the hardened sequence package.
 */
export class ScientificSequence {
  private seq: Seq;

  constructor(sequenceString: string, type: Alphabet = 'DNA') {
    this.seq = new Seq(type).read(sequenceString);
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
}
