import { describe, expect, it } from 'vitest';
import { createSequenceDiffManifest, sequenceDiffToJson } from '../../src/export/sequence-diff-json';
import { diffBiologicalSequences } from '../../src/scientific/biological-sequence-diff';

describe('sequence diff JSON export', () => {
  const result = diffBiologicalSequences(
    { id: 'reference', name: 'Reference', topology: 'circular', sequence: 'AACCGGTT', features: [] },
    { id: 'query', name: 'Query', topology: 'circular', sequence: 'AATCGGTT', features: [] },
  );

  it('is deterministic and sequence-private by default', () => {
    const first = sequenceDiffToJson(result);
    expect(sequenceDiffToJson(result)).toBe(first);
    expect(first).toContain('sequenceChecksum');
    expect(first).not.toContain('AACCGGTT');
    expect(first).not.toContain('alignedReference');
    expect(JSON.parse(first).schema).toBe('https://seqcraft.dev/schemas/sequence-diff/v1');
  });

  it('can explicitly include canonical sequences and alignment for local export', () => {
    const manifest = createSequenceDiffManifest(result, { includeCanonicalSequences: true, includeAlignment: true, includeInputProvenance: true });
    expect(manifest.reference.sequence).toBe(result.reference.sequence);
    expect(manifest.alignedReference).toBe(result.alignedReference);
    expect(manifest.reference.rotation0).toBe(result.reference.rotation0);
  });

  it('is stable across equivalent circular input origins', () => {
    const rotate = (sequence: string, amount: number) => sequence.slice(amount) + sequence.slice(0, amount);
    const transformed = diffBiologicalSequences(
      { id: 'other-reference-id', name: 'Other reference name', topology: 'circular', sequence: rotate('AACCGGTT', 3), features: [] },
      { id: 'other-query-id', name: 'Other query name', topology: 'circular', sequence: rotate('AATCGGTT', 5), features: [] },
    );
    expect(sequenceDiffToJson(transformed)).toBe(sequenceDiffToJson(result));
  });
});
