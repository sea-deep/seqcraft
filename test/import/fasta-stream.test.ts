import { describe, expect, it } from 'vitest';
import { parseFastaStream, type FastaStreamRecord } from '../../src/import/fasta-stream';

async function importChunks(chunks: string[]) {
  const records: Array<FastaStreamRecord & { sequence: string }> = [];
  let active: { id: string; name: string; sequence: string } | undefined;
  await parseFastaStream((async function* () { for (const chunk of chunks) yield new TextEncoder().encode(chunk); })(), {
    async startRecord(id, name) { active = { id, name, sequence: '' }; },
    async writeSequence(sequence) { active!.sequence += sequence; },
    async finishRecord(record) { records.push({ ...record, sequence: active!.sequence }); active = undefined; },
  }, { defaultName: 'fixture', createId: (() => { let id = 0; return () => `id-${++id}`; })() });
  return records;
}

describe('streaming FASTA parsing', () => {
  it('preserves records when headers, CRLF, and sequence lines cross arbitrary chunks', async () => {
    const records = await importChunks(['>', 'dna one\r', '\nACG', 'T\r\nA', 'A\n>rn', 'a two\nACG', 'U\n']);
    expect(records).toEqual([
      { id: 'id-1', name: 'dna one', sequence: 'ACGTAA', length: 6, alphabet: 'DNA' },
      { id: 'id-2', name: 'rna two', sequence: 'ACGU', length: 4, alphabet: 'RNA' },
    ]);
  });

  it('rejects invalid nucleotide data', async () => {
    await expect(importChunks(['>bad\nACGTZ\n'])).rejects.toThrow(/non-IUPAC/);
  });
});
