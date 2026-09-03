import { type Alphabet } from 'nucleotide-sequence';

export function sanitizeSequence(raw: string): string {
  return raw.replace(/[\s\d\-.]/g, '').toUpperCase();
}

export function inferAlphabet(sequence: string): Alphabet {
  const validIUPAC = /^[ACGTURYSWKMBDHVN\-.\s]*$/i;
  if (!validIUPAC.test(sequence)) {
    throw new Error('Invalid nucleotide sequence: contains non-IUPAC characters.');
  }

  const hasT = /[Tt]/.test(sequence);
  const hasU = /[Uu]/.test(sequence);

  if (hasT && hasU) return 'MIXED';
  if (hasT && !hasU) return 'DNA';
  if (hasU && !hasT) return 'RNA';

  return 'UNKNOWN';
}
