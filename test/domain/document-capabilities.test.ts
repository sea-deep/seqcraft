import { describe, expect, it } from 'vitest';
import { getDocumentCapabilities } from '../../src/domain/document';

describe('large-document capability gating', () => {
  it('distinguishes unsupported science from a zero-result analysis', () => {
    expect(getDocumentCapabilities({ storageMode: 'chunked' })).toMatchObject({
      sequenceView: true, regionExtraction: true, wholeSequenceAnalysis: false,
      annotations: false, primers: false, pcr: false, cloning: false, map: false,
    });
    expect(getDocumentCapabilities({ storageMode: 'memory' }).wholeSequenceAnalysis).toBe(true);
  });
});
