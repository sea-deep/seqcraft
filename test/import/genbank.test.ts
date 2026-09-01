import { describe, it, expect } from 'vitest';
import { importDocument } from '../../src/import/normalize-document';

describe('GenBank Import', () => {
  it('imports a basic linear genbank with joined features and validates against actual sequence length', () => {
    // 40 bases sequence
    const gb = `LOCUS       SCU49845     40 bp    DNA             PLN       21-JUN-1999
FEATURES             Location/Qualifiers
     gene            join(10..20,30..40)
                     /gene="CPA1"
ORIGIN
        1 gatcgatcga tcgatcgatc gatcgatcga tcgatcgatc
//
`;
    const docs = importDocument(gb);
    expect(docs).toHaveLength(1);
    const doc = docs[0];
    
    expect(doc.name).toBe('SCU49845');
    expect(doc.topology).toBe('linear');
    expect(doc.sequence.length).toBe(40);
    expect(doc.features).toHaveLength(1);
    
    const feature = doc.features[0];
    expect(feature.name).toBe('CPA1');
    expect(feature.segments).toEqual([
      { start0: 9, end0Exclusive: 20 },
      { start0: 29, end0Exclusive: 40 }
    ]);
  });

  it('bounds out of bounds features to sequence length', () => {
    const gb = `LOCUS       TEST         20 bp    DNA             PLN       21-JUN-1999
FEATURES             Location/Qualifiers
     gene            100..200
ORIGIN
        1 gatcgatcga tcgatcgatc
//
`;
    const docs = importDocument(gb);
    const feature = docs[0].features[0];
    // teselagen converts 100..200 to 0..19 bounds for a 20bp sequence.
    expect(feature.segments[0].start0).toBe(0);
    expect(feature.segments[0].end0Exclusive).toBe(20);
  });

  it('handles complement correctly', () => {
    const gb = `LOCUS       TEST         20 bp    DNA             PLN       21-JUN-1999
FEATURES             Location/Qualifiers
     gene            complement(1..10)
ORIGIN
        1 gatcgatcga tcgatcgatc
//
`;
    const docs = importDocument(gb);
    const feature = docs[0].features[0];
    expect(feature.strand).toBe(-1);
    expect(feature.segments).toEqual([{ start0: 0, end0Exclusive: 10 }]);
  });

  it('normalizes origin-spanning features correctly', () => {
    const gb = `LOCUS       TEST         20 bp    DNA     circular PLN       21-JUN-1999
FEATURES             Location/Qualifiers
     gene            join(18..20,1..4)
ORIGIN
        1 gatcgatcga tcgatcgatc
//
`;
    const docs = importDocument(gb);
    const feature = docs[0].features[0];
    expect(feature.segments).toEqual([
      { start0: 17, end0Exclusive: 20 },
      { start0: 0, end0Exclusive: 4 }
    ]);
  });

  it('handles RNA genbank', () => {
    const gb = `LOCUS       TEST         20 bp    RNA             PLN       21-JUN-1999
ORIGIN
        1 gaucgaucga ucgaucgauc
//
`;
    const docs = importDocument(gb);
    expect(docs[0].alphabet).toBe('RNA');
  });
});
