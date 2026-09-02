import { describe, expect, it } from 'vitest';
import { importGenBank } from '../../src/import/genbank';
import { DEMO_GENBANK } from '../../src/data/demo-workspace';
import { toProjectMetadataInput } from '../../src/platform/workspace-sync';

describe('workspace metadata projection', () => {
  it('does not include raw sequences, features, primers, or qualifiers', () => {
    const document = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    const projected = toProjectMetadataInput([document], document.id, 'map');
    const serialized = JSON.stringify(projected);

    expect(projected.documents[0]).toEqual({
      id: document.id,
      name: document.name,
      length: document.length,
      alphabet: 'dna',
      topology: 'circular',
      localStorageKey: `indexeddb:doc-meta-${document.id}`,
    });
    expect(serialized).not.toContain(document.sequence!.raw.slice(0, 24));
    expect(serialized).not.toContain('features');
    expect(serialized).not.toContain('primers');
    expect(serialized).not.toContain('qualifiers');
  });
});
