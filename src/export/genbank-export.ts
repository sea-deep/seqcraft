import { getMemorySequence } from '../utils/document-utils';
import type { SequenceDocument } from '../domain/document';
import type { Feature } from '../domain/feature';
import { getFeatureTypeMetadata } from '../domain/feature-ontology';
import { analyzePrimerBindings } from '../scientific/primer-binding';

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
  const hasExistingSource = document.features.some(f => {
    const meta = getFeatureTypeMetadata(f.type);
    return f.type === 'source' || meta.genbankKey === 'source';
  });
  if (!hasExistingSource) {
    lines.push(`     source          1..${len}`);
    lines.push(`                     /organism="synthetic DNA construct"`);
    lines.push(`                     /mol_type="other DNA"`);
  }

  for (const feat of document.features) {
    const meta = getFeatureTypeMetadata(feat.type);
    const genbankKey = meta.genbankKey || 'misc_feature';
    const featType = genbankKey.padEnd(16, ' ');
    const loc = formatLocation(feat, len);
    lines.push(`     ${featType}${loc}`);
    lines.push(`                     /label="${feat.name.replace(/"/g, "'")}"`);
    if (feat.qualifiers) {
      for (const [k, v] of Object.entries(feat.qualifiers)) {
        if (k === 'label' || k === 'original_type') continue;
        const valArr = Array.isArray(v) ? v : [v];
        for (const val of valArr) {
          if (typeof val === 'number' || (typeof val === 'string' && /^\d+$/.test(val.trim()))) {
            lines.push(`                     /${k}=${val}`);
          } else {
            lines.push(`                     /${k}="${String(val).replace(/"/g, "'")}"`);
          }
        }
      }
    }
  }

  if (document.primers && document.primers.length > 0) {
    const featType = 'primer_bind'.padEnd(16, ' ');
    for (const primer of document.primers) {
      const bindings = analyzePrimerBindings(rawSeq, document.topology, primer);
      if (bindings.length > 0) {
        for (const b of bindings) {
          const loc = b.orientation === 'reverse'
            ? `complement(${b.start0 + 1}..${b.end0Exclusive})`
            : `${b.start0 + 1}..${b.end0Exclusive}`;
          lines.push(`     ${featType}${loc}`);
          lines.push(`                     /label="${primer.name.replace(/"/g, "'")}"`);
          lines.push(`                     /primer_name="${primer.name.replace(/"/g, "'")}"`);
          lines.push(`                     /sequence="${primer.sequence}"`);
          if (primer.description) {
            lines.push(`                     /note="${primer.description.replace(/"/g, "'")}"`);
          }
        }
      } else {
        lines.push(`     ${featType}1..${primer.sequence.length}`);
        lines.push(`                     /label="${primer.name.replace(/"/g, "'")}"`);
        lines.push(`                     /primer_name="${primer.name.replace(/"/g, "'")}"`);
        lines.push(`                     /sequence="${primer.sequence}"`);
        if (primer.description) {
          lines.push(`                     /note="${primer.description.replace(/"/g, "'")}"`);
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
