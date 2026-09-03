import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import type { SequenceDocument } from '../../domain/document';
import { downloadFile, serializeToFasta, serializeToGenBank, serializeToSeqCraft } from '../../export/export-document';

export function ExportDialog({ document, children }: { document: SequenceDocument; children: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'seqcraft' | 'genbank' | 'fasta'>('seqcraft');

  const handleExport = () => {
    if (format === 'seqcraft') {
      const json = serializeToSeqCraft(document);
      downloadFile(json, `${document.name}.seqcraft`, 'application/json');
    } else if (format === 'genbank') {
      const gbk = serializeToGenBank(document);
      downloadFile(gbk, `${document.name}.gb`, 'text/plain');
    } else {
      const fasta = serializeToFasta(document);
      downloadFile(fasta, `${document.name}.fasta`, 'text/plain');
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-[425px] p-5">
        <DialogHeader>
          <DialogTitle>Export {document.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-[13px]">
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-3 rounded-md border border-[var(--border)] p-3 cursor-pointer hover:bg-[var(--panel-muted)] transition-colors">
              <input type="radio" name="export-format" value="seqcraft" checked={format === 'seqcraft'} onChange={() => setFormat('seqcraft')} className="mt-1" />
              <div>
                <div className="font-semibold text-[var(--text)]">SeqCraft Project (.seqcraft)</div>
                <div className="text-[12px] text-[var(--text-muted)] mt-0.5">Lossless format. Preserves all features, primers, and topology metadata.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-[var(--border)] p-3 cursor-pointer hover:bg-[var(--panel-muted)] transition-colors">
              <input type="radio" name="export-format" value="genbank" checked={format === 'genbank'} onChange={() => setFormat('genbank')} className="mt-1" />
              <div>
                <div className="font-semibold text-[var(--text)]">GenBank (.gb)</div>
                <div className="text-[12px] text-[var(--text-muted)] mt-0.5">Standard NCBI GenBank format. Compatible with Benchling, SnapGene, and NCBI.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-[var(--border)] p-3 cursor-pointer hover:bg-[var(--panel-muted)] transition-colors">
              <input type="radio" name="export-format" value="fasta" checked={format === 'fasta'} onChange={() => setFormat('fasta')} className="mt-1" />
              <div>
                <div className="font-semibold text-[var(--text)]">FASTA (.fasta)</div>
                <div className="text-[12px] text-[var(--text-muted)] mt-0.5">Standard FASTA format. Exports only the raw nucleotide sequence.</div>
              </div>
            </label>
          </div>
          <button
            onClick={handleExport}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] font-semibold text-[13px] py-2 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
