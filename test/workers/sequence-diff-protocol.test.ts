import { describe, expect, it } from 'vitest';
import { executeSequenceDiffRequest } from '../../src/workers/sequence-diff-protocol';

describe('sequence diff worker protocol', () => {
  it('returns cloneable semantic and circular geometry output with a stable request ID', () => {
    const response = executeSequenceDiffRequest({
      type: 'DIFF',
      requestId: 'request-1',
      reference: { id: 'r', name: 'Reference', topology: 'circular', sequence: 'AACCGGTT', features: [] },
      query: { id: 'q', name: 'Query', topology: 'circular', sequence: 'AATCGGTT', features: [] },
      geometryOptions: { width: 500, height: 500 },
    });
    expect(response.requestId).toBe('request-1');
    expect(response.result.differences).toHaveLength(1);
    expect(response.geometry).toMatchObject({ width: 500, height: 500 });
    expect(() => structuredClone(response)).not.toThrow();
  });
});
