import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { handleImportDocument } from '../../workflows/import-document';
import { FileUp, FileText } from 'lucide-react';

export function ImportDialog({ children, open: controlledOpen, onOpenChange }: { children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      handleImportDocument(text, file.name);
      setOpen(false);
    } catch (err: any) {
      let msg = err.message || 'Failed to import file';
      if (msg.includes('Invalid character')) {
        msg = `Failed to parse sequence: ${msg}\n\nNote: SeqCraft only supports DNA/RNA sequences. Protein/amino acid sequences are not supported.`;
      }
      setError(msg);
    }
    e.target.value = '';
  };

  const onPasteSubmit = () => {
    setError(null);
    if (!pastedText.trim()) return;
    try {
      handleImportDocument(pastedText);
      setPastedText('');
      setOpen(false);
    } catch (err: any) {
      let msg = err.message || 'Failed to import sequence';
      if (msg.includes('Invalid character')) {
        msg = `Failed to parse sequence: ${msg}\n\nNote: SeqCraft only supports DNA/RNA sequences. Protein/amino acid sequences are not supported.`;
      }
      setError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger className="w-full text-left outline-none block">
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Sequence</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium uppercase tracking-wider text-[var(--text-muted)]">From File</label>
            <label className="cursor-pointer border-2 border-dashed border-[var(--border)] rounded-md p-6 flex flex-col items-center justify-center text-[var(--text-muted)] hover:bg-[var(--panel-muted)] transition-colors">
              <FileUp className="w-8 h-8 mb-2" />
              <span className="text-[14px]">Click to select sequence file</span>
              <span className="text-[12px] mt-1">.fasta, .gb, .txt, or raw text</span>
              <input type="file" className="hidden" accept=".fasta,.fa,.gb,.gbk,.txt" onChange={onFileUpload} />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)]">OR PASTE TEXT</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium uppercase tracking-wider text-[var(--text-muted)]">From Text</label>
            <textarea
              className="w-full h-[120px] bg-[var(--bg)] border border-[var(--border)] rounded-md p-3 text-[13px] font-mono focus:outline-none focus:border-[var(--accent)] resize-none"
              placeholder="Paste raw sequence, FASTA, or GenBank text here..."
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
            />
            <button
              onClick={onPasteSubmit}
              disabled={!pastedText.trim()}
              className="mt-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-medium text-[13px] py-2 rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Import Text
            </button>
          </div>

          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-[12px]">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
