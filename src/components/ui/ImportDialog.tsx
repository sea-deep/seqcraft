import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { handleImportDocument } from '../../workflows/import-document';
import { importLargeFasta, type ImportProgress } from '../../workflows/import-large-fasta';
import { FileUp, FileText, X } from 'lucide-react';

export function ImportDialog({ children, open: controlledOpen, onOpenChange }: { children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Large import state
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [abortImport, setAbortImport] = useState<(() => void) | null>(null);

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024 && (file.name.endsWith('.fasta') || file.name.endsWith('.fa'))) {
      setImporting(true);
      setProgress({ bytesRead: 0, totalBytes: file.size, recordsIndexed: 0 });
      
      const abort = importLargeFasta(
        file,
        (p) => setProgress(p),
        () => {
          setImporting(false);
          setOpen(false);
        },
        (err) => {
          setImporting(false);
          setError(err);
        }
      );
      setAbortImport(() => abort);
    } else {
      // Normal flow
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

  const handleCancel = () => {
    if (abortImport) abortImport();
    setImporting(false);
    setProgress(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o && importing) return; // Prevent closing while importing
      setOpen(o);
    }}>
      {children && (
        <DialogTrigger>
          <div className="w-full text-left outline-none block">
            {children}
          </div>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Sequence</DialogTitle>
        </DialogHeader>
        
        {importing && progress ? (
          <div className="flex flex-col gap-4 py-6">
            <h3 className="font-semibold text-[14px]">Importing large sequence...</h3>
            
            <div className="h-2 w-full bg-[var(--border)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--accent)] transition-all duration-300" 
                style={{ width: `${(progress.bytesRead / progress.totalBytes) * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[12px] text-[var(--text-muted)]">
              <span>{Math.round(progress.bytesRead / 1024 / 1024)} MB / {Math.round(progress.totalBytes / 1024 / 1024)} MB</span>
              <span>{progress.recordsIndexed} sequences indexed</span>
            </div>

            <button 
              onClick={handleCancel}
              className="mt-4 w-full bg-[var(--panel-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] text-[var(--text)] text-[13px] font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel Import
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">Import from file</label>
              <label className="cursor-pointer border-2 border-dashed border-[var(--border)] rounded-md p-6 flex flex-col items-center justify-center text-[var(--text-muted)] hover:bg-[var(--panel-muted)] transition-colors">
                <FileUp className="w-8 h-8 mb-2" />
                <span className="text-[13px] font-medium text-[var(--text)]">Click to select sequence file</span>
                <span className="text-[11px] mt-1 text-[var(--text-muted)]">.fasta, .gb, .txt, or raw text</span>
                <input type="file" className="hidden" accept=".fasta,.fa,.gb,.gbk,.txt" onChange={onFileUpload} />
              </label>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[11px] font-medium text-[var(--text-muted)]">or paste text</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">Paste sequence</label>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
