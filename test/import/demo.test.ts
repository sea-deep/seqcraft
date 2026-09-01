import { describe, it, expect } from 'vitest';
import { DEMO_GENBANK } from '../../src/data/demo-workspace';
import { importDocument } from '../../src/import/normalize-document';

describe('Demo Workspace Fixture', () => {
  it('loads the pUC19 demo fixture accurately', () => {
    const docs = importDocument(DEMO_GENBANK);
    expect(docs).toHaveLength(1);
    
    const doc = docs[0];
    expect(doc.name).toBe('pUC19');
    expect(doc.topology).toBe('circular');
    expect(doc.sequence.length).toBe(2686);
    expect(doc.alphabet).toBe('DNA');
    
    const repOrigin = doc.features.find(f => f.type === 'origin');
    expect(repOrigin).toBeDefined();
    expect(repOrigin?.segments[0].start0).toBe(1481); // 1482 in 1-based inclusive -> 1481 in 0-based
    expect(repOrigin?.segments[0].end0Exclusive).toBe(2070); // 2070 in 1-based inclusive -> 2070 in 0-based exclusive
    
    const ampR = doc.features.find(f => f.type === 'gene' && f.name === 'AmpR');
    expect(ampR).toBeDefined();
    expect(ampR?.strand).toBe(-1);
    
    // Verify that every feature is strictly in bounds
    for (const f of doc.features) {
      for (const seg of f.segments) {
        expect(seg.start0).toBeGreaterThanOrEqual(0);
        expect(seg.end0Exclusive).toBeLessThanOrEqual(doc.sequence.length);
        expect(seg.end0Exclusive).toBeGreaterThan(seg.start0);
      }
    }
  });
});
