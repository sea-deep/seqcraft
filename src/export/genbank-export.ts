import { getMemorySequence } from '../utils/document-utils';
import type { SequenceDocument } from '../domain/document';
import type { Feature } from '../domain/feature';
import { getFeatureTypeMetadata } from '../domain/feature-ontology';

function formatLocation(feature: Feature, docLen: number): string {
  const isComplement = feature.strand === -1;
  const spans = feature.segments.map(s => {
    const start1 = s.start0 + 1;
    const end1 = s.end0Exclusive;
    return `${start1}..${end1}`;
  });

  let locStr: string;
  if (spans.length === 1) {
    locStr = spans[0];
  } else if (spans.length > 1) {
    locStr = `join(${spans.join(',')})`;
  } else {
    locStr = `1..${docLen}`;
  }

  return isComplement ? `complement(${locStr})` : locStr;
}

/**
 * Serializes a SequenceDocument into standard GenBank flat file format.
 */
export function serializeToGenBank(document: SequenceDocument): string {
  const rawSeq = getMemorySequence(document).raw.toLowerCase();
  const len = document.length;
  const isCircular = document.topology === 'circular';
  const alphabet = document.alphabet === 'RNA' ? 'RNA' : 'DNA';

  const now = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const formattedDate = `${day}-${month}-${year}`;

  const locusName = document.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 16).padEnd(16, ' ');

  const lines: string[] = [];
  lines.push(
    `LOCUS       ${locusName} ${len.toString().padStart(11, ' ')} bp    ${alphabet.padEnd(6, ' ')}  ${(isCircular ? 'circular' : 'linear  ')} SYN ${formattedDate}`
  );
  lines.push(`DEFINITION  ${document.name}.`);
  lines.push(`ACCESSION   ${document.id}`);
  lines.push(`VERSION     ${document.id}.1`);
  lines.push(`KEYWORDS    .`);
  lines.push(`SOURCE      synthetic DNA construct`);
  lines.push(`  ORGANISM  synthetic DNA construct`);
  lines.push(`FEATURES             Location/Qualifiers`);
  lines.push(`     source          1..${len}`);
  lines.push(`                     /organism="synthetic DNA construct"`);
  lines.push(`                     /mol_type="other DNA"`);

  for (const feat of document.features) {
    const meta = getFeatureTypeMetadata(feat.type);
    const genbankKey = meta.genbankKey || 'misc_feature';
    const featType = genbankKey.padEnd(16, ' ');
    const loc = formatLocation(feat, len);
    lines.push(`     ${featType}${loc}`);
    lines.push(`                     /label="${feat.name.replace(/"/g, "'")}"`);
    if (feat.qualifiers) {
      for (const [k, v] of Object.entries(feat.qualifiers)) {
        if (k !== 'label') {
          lines.push(`                     /${k}="${String(v).replace(/"/g, "'")}"`);
        }
      }
    }
  }

  lines.push(`ORIGIN`);
  for (let i = 0; i < len; i += 60) {
    const chunk = rawSeq.slice(i, i + 60);
    const pos = (i + 1).toString().padStart(9, ' ');
    const groups: string[] = [];
    for (let j = 0; j < chunk.length; j += 10) {
      groups.push(chunk.slice(j, j + 10));
    }
    lines.push(`${pos} ${groups.join(' ')}`);
  }
  lines.push(`//\n`);

  return lines.join('\n');
}
