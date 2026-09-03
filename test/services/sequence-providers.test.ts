import { describe, it, expect } from 'vitest';
import { sequenceProviders } from '../../src/services/providers/registry';
import { NcbiSequenceProvider } from '../../src/services/providers/ncbi-provider';
import { EnaSequenceProvider } from '../../src/services/providers/ena-provider';
import { AddgeneSequenceProvider } from '../../src/services/providers/addgene-provider';
import { SequenceProviderError } from '../../src/services/providers/types';

describe('SequenceProvider Registry', () => {
  it('registers ncbi, ena, and addgene providers and aliases', () => {
    expect(sequenceProviders.get('ncbi')).toBeInstanceOf(NcbiSequenceProvider);
    expect(sequenceProviders.get('genbank')).toBeInstanceOf(NcbiSequenceProvider);
    expect(sequenceProviders.get('refseq')).toBeInstanceOf(NcbiSequenceProvider);
    expect(sequenceProviders.get('ncbi-refseq')).toBeInstanceOf(NcbiSequenceProvider);
    expect(sequenceProviders.get('ena')).toBeInstanceOf(EnaSequenceProvider);
    expect(sequenceProviders.get('addgene')).toBeInstanceOf(AddgeneSequenceProvider);

    const list = sequenceProviders.list();
    expect(list.length).toBeGreaterThanOrEqual(3);
  });
});

describe('NcbiSequenceProvider', () => {
  const provider = new NcbiSequenceProvider();

  it('resolves pBR322 (J01749.1) as circular GenBank with annotations', async () => {
    const resolved = await provider.resolve('J01749.1');
    expect(resolved.accession).toBe('J01749.1');
    expect(resolved.format).toBe('genbank');
    expect(resolved.topology).toBe('circular');
    expect(resolved.lengthBp).toBe(4361);
    expect(resolved.featureCount).toBeGreaterThan(10);
    expect(resolved.rawText).toContain('LOCUS');
    expect(resolved.rawText).toContain('ORIGIN');
    expect(resolved.sourceUrl).toBe('https://www.ncbi.nlm.nih.gov/nuccore/J01749.1');
  }, 15000);

  it('resolves eGFP (OQ870305.1) as linear GenBank with CDS annotation', async () => {
    const resolved = await provider.resolve('OQ870305.1');
    expect(resolved.accession).toBe('OQ870305.1');
    expect(resolved.format).toBe('genbank');
    expect(resolved.topology).toBe('linear');
    expect(resolved.lengthBp).toBe(783);
    expect(resolved.featureCount).toBeGreaterThan(0);
    expect(resolved.rawText).toContain('LOCUS');
    expect(resolved.rawText).toContain('ORIGIN');
  }, 15000);

  it('resolves Lambda phage (NC_001416.1) as linear GenBank (48,502 bp)', async () => {
    const resolved = await provider.resolve('NC_001416.1');
    expect(resolved.accession).toBe('NC_001416.1');
    expect(resolved.lengthBp).toBe(48502);
    expect(resolved.topology).toBe('linear');
    expect(resolved.rawText).toContain('LOCUS');
  }, 20000);

  it('throws UNKNOWN_ACCESSION on non-existent accession', async () => {
    await expect(provider.resolve('NON_EXISTENT_ACCESSION_XYZ_99999')).rejects.toThrow(
      expect.objectContaining({ code: 'UNKNOWN_ACCESSION' })
    );
  }, 15000);

  it('throws UNKNOWN_ACCESSION on empty accession', async () => {
    await expect(provider.resolve('   ')).rejects.toThrow(
      expect.objectContaining({ code: 'UNKNOWN_ACCESSION' })
    );
  });

  it('searches for pBR322 and returns candidates with metadata', async () => {
    const results = await provider.search('pBR322', { limit: 3 });
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first.accession).toBeDefined();
    expect(first.title).toBeDefined();
    expect(first.provider).toBe('ncbi');
  }, 15000);
});

describe('EnaSequenceProvider', () => {
  const provider = new EnaSequenceProvider();

  it('resolves J01749.1 in FASTA format from ENA', async () => {
    const resolved = await provider.resolve('J01749.1');
    expect(resolved.accession).toBe('J01749.1');
    expect(resolved.format).toBe('fasta');
    expect(resolved.lengthBp).toBe(4361);
    expect(resolved.rawText).toContain('>');
  }, 15000);
});

describe('AddgeneSequenceProvider', () => {
  const provider = new AddgeneSequenceProvider();

  it('resolves curated plasmid pX330 (12260)', async () => {
    const resolved = await provider.resolve('12260');
    expect(resolved.accession).toBe('12260');
    expect(resolved.name).toBe('pX330');
    expect(resolved.lengthBp).toBe(8484);
    expect(resolved.topology).toBe('circular');
    expect(resolved.featureCount).toBe(7);
    expect(resolved.rawText).toContain('LOCUS');
    expect(resolved.rawText).toContain('SpCas9');
  });

  it('throws UNSUPPORTED_ADDGENE_ACCESSION on unindexed Addgene accession', async () => {
    await expect(provider.resolve('99999999')).rejects.toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED_ADDGENE_ACCESSION' })
    );
  });

  it('searches curated Addgene plasmids for cas9', async () => {
    const matches = await provider.search('cas9');
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches.some(m => m.accession === '12260')).toBe(true);
  });
});
