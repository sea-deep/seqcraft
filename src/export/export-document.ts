import { getMemorySequence } from '../utils/document-utils';
import type { SequenceDocument } from '../domain/document';
export { serializeToGenBank } from './genbank-export';

export const EXPORT_FORMATS = ['genbank', 'fasta', 'seqcraft'] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];

export const EXPORT_EXTENSIONS: Record<ExportFormat, string> = {
  genbank: '.gb',
  fasta: '.fasta',
  seqcraft: '.seqcraft'
};

export const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  genbank: 'text/plain',
  fasta: 'text/plain',
  seqcraft: 'application/json'
};

export function serializeToFasta(document: SequenceDocument): string {
  const sequence = getMemorySequence(document).raw;
  // Fold sequence to 80 chars per line
  const folded = sequence.match(/.{1,80}/g)?.join('\n') || '';
  return `>${document.name}\n${folded}\n`;
}

export function serializeToSeqCraft(document: SequenceDocument): string {
  // Convert the ScientificSequence object into just its raw string for JSON
  const payload = {
    ...document,
    sequence: getMemorySequence(document).raw
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
