import { describe, expect, it } from 'vitest';
import { hydrateDocument, serializeDocument } from '../../src/storage/metadata-db';
import { ScientificSequence } from '../../src/scientific/nucleotide';
import type { SequenceDocument } from '../../src/domain/document';

describe('document metadata serialization contract', () => {
  it.each(['DNA', 'RNA'] as const)('round trips a %s memory document', alphabet => {
    const raw = alphabet === 'DNA' ? 'ACGTRYSWKMBDHVN' : 'ACGURYSWKMBDHVN';
    const document: SequenceDocument = {
      id: `memory-${alphabet}`, name: `${alphabet} example`, topology: 'circular',
      sequence: new ScientificSequence(raw, alphabet), length: raw.length, storageMode: 'memory', alphabet,
      features: [{ id: 'feature-1', name: 'origin feature', type: 'misc_feature', strand: -1, segments: [{ start0: 12, end0Exclusive: raw.length }, { start0: 0, end0Exclusive: 2 }], qualifiers: { note: ['a', 'b'] }, source: 'manual' }],
      primers: [{ id: 'primer-1', name: 'primer', sequence: 'ACGT' }], source: 'raw', version: 4,
    };
    const dto = serializeDocument(document);
    expect(dto.storage).toEqual({ mode: 'memory', sequence: raw });
    const hydrated = hydrateDocument(structuredClone(dto));
    expect(hydrated).toMatchObject({ ...document, sequence: expect.any(ScientificSequence) });
    expect(hydrated.sequence?.raw).toBe(raw);
  });

  it('round trips chunked metadata without sequence bytes', () => {
    const document: SequenceDocument = {
      id: 'large-1', name: 'reference', topology: 'linear', sequence: null, length: 10_000_003,
      storageMode: 'chunked', storageRef: { backend: 'opfs', key: 'large-1' }, alphabet: 'DNA',
      features: [], primers: [], source: 'fasta', version: 1,
    };
    const dto = serializeDocument(document);
    expect(JSON.stringify(dto)).not.toContain('sequence":"');
    expect(hydrateDocument(structuredClone(dto))).toEqual(document);
  });
});
