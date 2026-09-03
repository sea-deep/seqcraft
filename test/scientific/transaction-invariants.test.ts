import { describe, it, expect } from 'vitest';
import type { SequenceDocument } from '../../src/domain/document';
import { ScientificSequence } from '../../src/scientific/nucleotide';
import { evaluateTransactionInvariants } from '../../src/scientific/transaction-invariants';
import { editSequence, type SequenceEditAction } from '../../src/scientific/sequence-editing';
import { computeSequenceSha256 } from '../../src/utils/sequence-hash';

describe('Generic Transaction Invariant Verification', () => {
  function createTestDocument(seq: string, strand: 1 | -1 = 1): SequenceDocument {
    return {
      id: 'test-doc-1',
      name: 'Test Construct',
      topology: 'circular',
      length: seq.length,
      storageMode: 'memory',
      alphabet: 'DNA',
      version: 1,
      source: 'raw',
      sequence: new ScientificSequence(seq, 'DNA'),
      primers: [],
      features: [
        {
          id: 'test-cds',
          name: 'test_gene',
          type: 'CDS',
          strand,
          segments: [{ start0: 0, end0Exclusive: seq.length }],
          qualifiers: {},
          source: 'manual'
        }
      ]
    };
  }

  it('detects synonymous mutation and restriction site abolishment on arbitrary sequence', async () => {
    // ATGGGTCTCTAA:
    // Codons: ATG (Met), GGT (Gly), CTC (Leu), TAA (Stop)
    // Contains BsaI site: GGTCTC at index 3..9
    // Mutate T->C at index 5 (1-based 6): GGT->GGC (both Gly)
    const raw = 'ATGGGTCTCTAA';
    const doc = createTestDocument(raw);

    const action: SequenceEditAction = {
      type: 'replace',
      start0: 3,
      end0Exclusive: 9,
      replacement: 'GGCCTC'
    };

    const editResult = editSequence(raw, doc.features, action, doc.topology);
    expect(editResult.newSequence).toBe('ATGGGCCTCTAA');

    const report = evaluateTransactionInvariants(doc, action, editResult, 'BsaI');
    expect(report.passed).toBe(true);
    expect(report.position1).toBe(6);
    expect(report.originalBase).toBe('T');
    expect(report.mutatedBase).toBe('C');
    expect(report.changedNucleotideCount).toBe(1);
    expect(report.lengthDelta).toBe(0);
    expect(report.coordinatesStable).toBe(true);

    expect(report.cdsVerification).toBeDefined();
    expect(report.cdsVerification!.isSynonymous).toBe(true);
    expect(report.cdsVerification!.aminoAcidBefore).toBe('Gly-Leu');
    expect(report.cdsVerification!.aminoAcidAfter).toBe('Gly-Leu');

    expect(report.enzymeVerification).toBeDefined();
    expect(report.enzymeVerification!.countBefore).toBe(1);
    expect(report.enzymeVerification!.countAfter).toBe(0);
    expect(report.enzymeVerification!.abolished).toBe(true);

    // Hash check
    const hashBefore = await computeSequenceSha256(raw);
    const hashAfter = await computeSequenceSha256(editResult.newSequence);
    expect(hashBefore).not.toBe(hashAfter);
  });

  it('flags non-synonymous mutation', () => {
    // Mutate ATG GGT CTC TAA -> ATG TGT CTC TAA (Gly -> Cys)
    const raw = 'ATGGGTCTCTAA';
    const doc = createTestDocument(raw);

    const action: SequenceEditAction = {
      type: 'replace',
      start0: 3,
      end0Exclusive: 9,
      replacement: 'TGTCTC'
    };

    const editResult = editSequence(raw, doc.features, action, doc.topology);
    const report = evaluateTransactionInvariants(doc, action, editResult, 'BsaI');

    expect(report.passed).toBe(false);
    expect(report.cdsVerification!.isSynonymous).toBe(false);
    expect(report.cdsVerification!.aminoAcidBefore).toBe('Gly-Leu');
    expect(report.cdsVerification!.aminoAcidAfter).toBe('Cys-Leu');
  });

  it('flags coordinate instability on length change', () => {
    const raw = 'ATGGGTCTCTAA';
    const doc = createTestDocument(raw);

    const action: SequenceEditAction = {
      type: 'insert',
      index0: 3,
      sequence: 'AAA'
    };

    const editResult = editSequence(raw, doc.features, action, doc.topology);
    const report = evaluateTransactionInvariants(doc, action, editResult, 'BsaI');

    expect(report.lengthDelta).toBe(3);
    expect(report.coordinatesStable).toBe(false);
  });
});
