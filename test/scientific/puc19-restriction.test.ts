import { describe, it, expect } from 'vitest';
import { analyzeRestrictionSites } from '../../src/scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../src/data/restriction-enzymes';
import { DEMO_GENBANK } from '../../src/data/demo-workspace';
import { importDocument } from '../../src/import/normalize-document';

describe('pUC19 validation', () => {
  it('correctly analyzes built-in enzymes against pUC19', () => {
    // Generate document from GenBank
    const docs = importDocument(DEMO_GENBANK);
    const doc = docs[0];
    expect(doc.name).toBe('pUC19');
    expect(doc.topology).toBe('circular');
    expect(doc.sequence.length).toBe(2686);

    const sites = analyzeRestrictionSites(doc.sequence.raw, doc.topology, BUILTIN_ENZYMES);
    
    // Group sites by enzyme name for assertions
    const byEnzyme: Record<string, typeof sites> = {};
    for (const site of sites) {
      byEnzyme[site.enzymeName] = byEnzyme[site.enzymeName] || [];
      byEnzyme[site.enzymeName].push(site);
    }

    // pUC19 is famous for its multiple cloning site.
    // EcoRI is a unique cutter at position 395
    const ecori = byEnzyme['EcoRI'];
    expect(ecori).toBeDefined();
    expect(ecori.length).toBe(1);
    expect(ecori[0].start0).toBe(395); // 0-based coordinate for 396

    // BamHI is a unique cutter at position 416
    const bamhi = byEnzyme['BamHI'];
    expect(bamhi).toBeDefined();
    expect(bamhi.length).toBe(1);
    expect(bamhi[0].start0).toBe(416);

    // XbaI is a unique cutter at position 422
    const xbai = byEnzyme['XbaI'];
    expect(xbai).toBeDefined();
    expect(xbai.length).toBe(1);
    expect(xbai[0].start0).toBe(422);

    // HindIII is a unique cutter at position 446
    const hindiii = byEnzyme['HindIII'];
    expect(hindiii).toBeDefined();
    expect(hindiii.length).toBe(1);
    expect(hindiii[0].start0).toBe(446);
  });
});
