import { describe, expect, it } from 'vitest';
import { LatestRangeRequest, SequenceRangeCache } from '../../src/components/sequence/sequence-range-cache';

describe('sequence viewport range isolation', () => {
  it('never returns another document range', async () => {
    const cache = new SequenceRangeCache();
    await cache.load('doc-a', 0, 4, async () => 'AAAA');
    expect(cache.find('doc-b', 0, 4)).toBeUndefined();
    expect((await cache.load('doc-b', 0, 4, async () => 'CCCC')).sequence).toBe('CCCC');
  });

  it('identifies stale out-of-order reads and document switches', () => {
    const requests = new LatestRangeRequest();
    const first = requests.begin();
    const second = requests.begin();
    expect(requests.isCurrent(first)).toBe(false);
    expect(requests.isCurrent(second)).toBe(true);
    requests.invalidate();
    expect(requests.isCurrent(second)).toBe(false);
  });
});
