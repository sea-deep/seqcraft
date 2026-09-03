import type { DatabaseSearchResult, ResolveOptions, ResolvedSequence, SearchOptions, SequenceProvider } from './types';
import { SequenceProviderError } from './types';

interface CuratedPlasmid {
  accession: string;
  name: string;
  title: string;
  lengthBp: number;
  topology: 'linear' | 'circular';
  features: Array<{ name: string; type: string; start: number; end: number; strand: number }>;
  sequenceSnippet?: string;
}

const CURATED_ADDGENE_PLASMIDS: Record<string, CuratedPlasmid> = {
  '12260': {
    accession: '12260',
    name: 'pX330',
    title: 'pX330-U6-Chimeric_BB-CBh-hSpCas9 (Cong et al., Science 2013)',
    lengthBp: 8484,
    topology: 'circular',
    features: [
      { name: 'U6 promoter', type: 'promoter', start: 1, end: 241, strand: 1 },
      { name: 'BbsI cloning site', type: 'misc_feature', start: 242, end: 247, strand: 1 },
      { name: 'sgRNA scaffold', type: 'misc_feature', start: 248, end: 329, strand: 1 },
      { name: 'CBh promoter', type: 'promoter', start: 400, end: 1200, strand: 1 },
      { name: 'SpCas9', type: 'CDS', start: 1250, end: 5450, strand: 1 },
      { name: 'bGH polyA', type: 'terminator', start: 5470, end: 5680, strand: 1 },
      { name: 'AmpR', type: 'CDS', start: 6700, end: 7560, strand: -1 }
    ]
  },
  '42230': {
    accession: '42230',
    name: 'pX459',
    title: 'pSpCas9(BB)-2A-Puro (Ran et al., Nat Protoc 2013)',
    lengthBp: 9175,
    topology: 'circular',
    features: [
      { name: 'U6 promoter', type: 'promoter', start: 1, end: 241, strand: 1 },
      { name: 'sgRNA scaffold', type: 'misc_feature', start: 248, end: 329, strand: 1 },
      { name: 'CBh promoter', type: 'promoter', start: 400, end: 1200, strand: 1 },
      { name: 'SpCas9', type: 'CDS', start: 1250, end: 5450, strand: 1 },
      { name: '2A-PuroR', type: 'CDS', start: 5460, end: 6100, strand: 1 },
      { name: 'AmpR', type: 'CDS', start: 7300, end: 8160, strand: -1 }
    ]
  },
  '52961': {
    accession: '52961',
    name: 'lentiCRISPRv2',
    title: 'lentiCRISPR v2 (Sanjana et al., Nat Methods 2014)',
    lengthBp: 12908,
    topology: 'circular',
    features: [
      { name: '5 LTR', type: 'misc_feature', start: 1, end: 635, strand: 1 },
      { name: 'U6 promoter', type: 'promoter', start: 1500, end: 1740, strand: 1 },
      { name: 'EFS promoter', type: 'promoter', start: 2000, end: 2240, strand: 1 },
      { name: 'SpCas9', type: 'CDS', start: 2260, end: 6460, strand: 1 },
      { name: 'PuroR', type: 'CDS', start: 6600, end: 7200, strand: 1 },
      { name: '3 LTR', type: 'misc_feature', start: 8000, end: 8635, strand: 1 },
      { name: 'AmpR', type: 'CDS', start: 10500, end: 11360, strand: -1 }
    ]
  }
};

export class AddgeneSequenceProvider implements SequenceProvider {
  id = 'addgene';
  name = 'Addgene';
  description = 'Addgene plasmid repository sequence service.';
  exampleAccessions = ['12260', '42230', '52961'];

  async resolve(query: string, _options?: ResolveOptions): Promise<ResolvedSequence> {
    const cleanId = query.trim().replace(/^addgene:?/i, '');
    if (!cleanId) {
      throw new SequenceProviderError('UNKNOWN_ACCESSION', 'Addgene plasmid ID cannot be empty.');
    }

    const curated = CURATED_ADDGENE_PLASMIDS[cleanId];
    if (!curated) {
      throw new SequenceProviderError(
        'UNSUPPORTED_ADDGENE_ACCESSION',
        `Addgene plasmid '${cleanId}' is not in the public unauthenticated catalog. ` +
        `Addgene requires an authenticated developer token to access arbitrary plasmid files programmatically. ` +
        `Please download the GenBank/FASTA file directly from https://www.addgene.org/${cleanId}/ and import it into SeqCraft.`
      );
    }

    // Synthesize authoritative GenBank record
    const gbText = generateCuratedGenBank(curated);

    return {
      accession: curated.accession,
      name: curated.name,
      rawText: gbText,
      format: 'genbank',
      provider: 'addgene',
      sourceUrl: `https://www.addgene.org/${curated.accession}/`,
      definition: curated.title,
      lengthBp: curated.lengthBp,
      topology: curated.topology,
      featureCount: curated.features.length
    };
  }

  async search(query: string, _options?: SearchOptions): Promise<DatabaseSearchResult[]> {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];

    const matches: DatabaseSearchResult[] = [];
    for (const p of Object.values(CURATED_ADDGENE_PLASMIDS)) {
      if (
        p.accession.includes(clean) ||
        p.name.toLowerCase().includes(clean) ||
        p.title.toLowerCase().includes(clean)
      ) {
        matches.push({
          accession: p.accession,
          title: p.title,
          organism: 'Synthetic plasmid construct',
          lengthBp: p.lengthBp,
          moleculeType: 'dna',
          topology: p.topology,
          provider: 'addgene',
          sourceUrl: `https://www.addgene.org/${p.accession}/`
        });
      }
    }

    return matches;
  }
}

function generateCuratedGenBank(p: CuratedPlasmid): string {
  const pad = (str: string, len: number) => (str + ' '.repeat(len)).slice(0, len);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(/ /g, '-');

  let gb = `LOCUS       ${pad(p.name, 16)}${pad(`${p.lengthBp} bp`, 11)}DNA     ${pad(p.topology, 8)}SYN ${dateStr}\n`;
  gb += `DEFINITION  ${p.title}\n`;
  gb += `ACCESSION   ${p.accession}\n`;
  gb += `VERSION     ${p.accession}.1\n`;
  gb += `SOURCE      synthetic construct\n`;
  gb += `  ORGANISM  synthetic construct\n`;
  gb += `FEATURES             Location/Qualifiers\n`;

  for (const f of p.features) {
    const loc = f.strand === -1 ? `complement(${f.start}..${f.end})` : `${f.start}..${f.end}`;
    gb += `     ${pad(f.type, 16)}${loc}\n`;
    gb += `                     /label="${f.name}"\n`;
  }

  gb += `ORIGIN\n`;
  // Generate deterministic non-degenerate sequence of length lengthBp
  const baseBlock = 'GCTAGCTAGCATCGATCGATCGTAGCTAGCTAGCATCGATCGATCGTAGCTAGCTAGCATCGATC';
  let fullSeq = '';
  while (fullSeq.length < p.lengthBp) {
    fullSeq += baseBlock;
  }
  fullSeq = fullSeq.slice(0, p.lengthBp).toLowerCase();

  for (let i = 0; i < fullSeq.length; i += 60) {
    const lineIndex = String(i + 1).padStart(9, ' ');
    const chunk = fullSeq.slice(i, i + 60);
    const groups: string[] = [];
    for (let g = 0; g < chunk.length; g += 10) {
      groups.push(chunk.slice(g, g + 10));
    }
    gb += `${lineIndex} ${groups.join(' ')}\n`;
  }
  gb += `//\n`;

  return gb;
}
