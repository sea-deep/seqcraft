import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { handleImportDocument } from '../../workflows/import-document';
import { importLargeFasta, type ImportProgress } from '../../workflows/import-large-fasta';
import { sequenceProviders } from '../../services/providers/registry';
import { previewDatabaseSequence, importDatabaseSequence, type DatabaseSequencePreview } from '../../workflows/fetch-database-sequence';
import { FileUp, FileText, Globe, Loader2, Check, ExternalLink, X } from 'lucide-react';

type ImportTab = 'upload' | 'paste' | 'database';

export function ImportDialog({
  children,
  open: controlledOpen,
  onOpenChange
}: {
  children?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;

  const [activeTab, setActiveTab] = useState<ImportTab>('upload');
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Large file import state
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [abortImport, setAbortImport] = useState<(() => void) | null>(null);

  // Database fetch state
  const [selectedProvider, setSelectedProvider] = useState('ncbi');
  const [accession, setAccession] = useState('');
  const [fetchingDb, setFetchingDb] = useState(false);
  const [dbPreview, setDbPreview] = useState<DatabaseSequencePreview | null>(null);

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

  const handleFetchDatabase = async () => {
    setError(null);
    setDbPreview(null);
    const cleanId = accession.trim();
    if (!cleanId) {
      setError('Please enter a valid accession ID.');
      return;
    }

    setFetchingDb(true);
    try {
      const preview = await previewDatabaseSequence(selectedProvider, cleanId);
      setDbPreview(preview);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sequence from database.');
    } finally {
      setFetchingDb(false);
    }
  };

  const handleConfirmDatabaseImport = async () => {
    if (!dbPreview) return;
    setError(null);
    setFetchingDb(true);
    try {
      await importDatabaseSequence(selectedProvider, dbPreview.resolved.accession, {
        openAfterImport: true
      });
      setDbPreview(null);
      setAccession('');
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to import sequence.');
    } finally {
      setFetchingDb(false);
    }
  };

  const handleCancel = () => {
    if (abortImport) abortImport();
    setImporting(false);
    setProgress(null);
    setDbPreview(null);
  };

  const availableProviders = sequenceProviders.list();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && importing) return;
        setOpen(o);
        if (!o) {
          setError(null);
          setDbPreview(null);
        }
      }}
    >
      {children && <DialogTrigger render={children} />}
      <DialogContent className="sm:max-w-[560px] max-w-[560px] p-5">
        <DialogHeader>
          <DialogTitle>Import Sequence</DialogTitle>
        </DialogHeader>

        {importing && progress ? (
          <div className="flex flex-col gap-4 py-6">
            <h3 className="font-semibold text-[14px]">Importing large sequence...</h3>

            <div
              className="h-2 w-full bg-[var(--border)] rounded-full overflow-hidden"
              role="progressbar"
              aria-label="Sequence import progress"
              aria-valuemin={0}
              aria-valuemax={progress.totalBytes}
              aria-valuenow={progress.bytesRead}
            >
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
              className="mt-4 w-full bg-[var(--panel-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] text-[var(--text)] text-[13px] font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" /> Cancel Import
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {/* 3-Tab Selector */}
            <div role="group" aria-label="Import method" className="flex items-center gap-1 p-1 bg-[var(--panel-muted)] rounded-lg text-xs font-medium border border-[var(--border)]">
              <button
                type="button"
                onClick={() => { setActiveTab('upload'); setError(null); }}
                className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-[var(--panel)] text-[var(--text)] font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <FileUp size={14} />
                <span>Upload file</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('paste'); setError(null); }}
                className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'paste'
                    ? 'bg-[var(--panel)] text-[var(--text)] font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <FileText size={14} />
                <span>Paste sequence</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('database'); setError(null); }}
                className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'database'
                    ? 'bg-[var(--panel)] text-[var(--text)] font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Globe size={14} />
                <span>Fetch from database</span>
              </button>
            </div>

            {/* TAB 1: Upload File */}
            {activeTab === 'upload' && (
              <div className="flex flex-col gap-3 py-2">
                <label className="cursor-pointer border-2 border-dashed border-[var(--border)] rounded-lg p-8 flex flex-col items-center justify-center text-[var(--text-muted)] hover:bg-[var(--panel-muted)] hover:border-[var(--accent)]/60 transition-all">
                  <FileUp className="w-8 h-8 mb-2 text-[var(--accent)]" />
                  <span className="text-[13px] font-medium text-[var(--text)]">Click to select sequence file</span>
                  <span className="text-[11px] mt-1 text-[var(--text-muted)]">.fasta, .gb, .gbk, .txt, or raw text</span>
                  <input type="file" className="hidden" accept=".fasta,.fa,.gb,.gbk,.txt" onChange={onFileUpload} />
                </label>
              </div>
            )}

            {/* TAB 2: Paste Sequence */}
            {activeTab === 'paste' && (
              <div className="flex flex-col gap-2 py-2">
                <textarea
                  aria-label="Sequence text"
                  className="w-full h-[140px] bg-[var(--bg)] border border-[var(--border)] rounded-md p-3 text-[12px] font-mono focus:outline-none focus:border-[var(--accent)] resize-none"
                  placeholder="Paste raw sequence, FASTA, or GenBank text here..."
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={onPasteSubmit}
                  disabled={!pastedText.trim()}
                  className="mt-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] font-semibold text-[13px] py-2 rounded-md disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Import Text
                </button>
              </div>
            )}

            {/* TAB 3: Fetch from Database */}
            {activeTab === 'database' && (
              <div className="flex flex-col gap-3.5 py-1">
                {!dbPreview ? (
                  <>
                    <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2 text-xs">
                      <span className="text-[var(--text-muted)] font-medium">Source</span>
                      <select
                        aria-label="Sequence database source"
                        value={selectedProvider}
                        onChange={e => setSelectedProvider(e.target.value)}
                        className="h-8 rounded border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--text)] font-medium outline-none focus:border-[var(--accent)]"
                      >
                        {availableProviders.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2 text-xs">
                      <span className="text-[var(--text-muted)] font-medium">Accession</span>
                      <input
                        type="text"
                        aria-label="Database accession"
                        placeholder="e.g. J01749.1, NC_001416.1, OQ870305.1"
                        value={accession}
                        onChange={e => setAccession(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleFetchDatabase(); }}
                        className="h-8 rounded border border-[var(--border)] bg-[var(--bg)] px-3 text-xs font-mono text-[var(--text)] outline-none focus:border-[var(--accent)]"
                      />
                    </div>

                    {/* Quick Accession Example Pills */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] flex-wrap pl-[90px]">
                      <span>Examples:</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedProvider('ncbi'); setAccession('J01749.1'); }}
                        className="px-2 py-0.5 rounded bg-[var(--panel-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] text-[var(--text-secondary)] font-mono transition-colors cursor-pointer"
                      >
                        J01749.1 (pBR322)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedProvider('ncbi'); setAccession('OQ870305.1'); }}
                        className="px-2 py-0.5 rounded bg-[var(--panel-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] text-[var(--text-secondary)] font-mono transition-colors cursor-pointer"
                      >
                        OQ870305.1 (eGFP)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedProvider('ncbi'); setAccession('NC_001416.1'); }}
                        className="px-2 py-0.5 rounded bg-[var(--panel-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] text-[var(--text-secondary)] font-mono transition-colors cursor-pointer"
                      >
                        NC_001416.1 (lambda)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleFetchDatabase}
                      disabled={fetchingDb || !accession.trim()}
                      className="mt-2 w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] font-semibold text-[13px] py-2 rounded-md disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      {fetchingDb ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Fetching sequence...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-4 h-4" />
                          <span>Fetch sequence</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  /* Preview Card */
                  <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-[var(--text)] truncate">{dbPreview.previewDoc.name}</h3>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] font-mono font-medium">
                            {dbPreview.resolved.accession}
                          </span>
                        </div>
                        {dbPreview.resolved.definition && (
                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">
                            {dbPreview.resolved.definition}
                          </p>
                        )}
                      </div>
                      <a
                        href={dbPreview.resolved.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--text-muted)] hover:text-[var(--accent)] p-1 transition-colors"
                        title="Open external database record"
                        aria-label={`Open ${dbPreview.resolved.accession} in the source database`}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 px-2.5 rounded bg-[var(--panel)] border border-[var(--border)]">
                      <div>
                        <span className="text-[var(--text-muted)]">Length: </span>
                        <span className="font-mono font-medium text-[var(--text)]">
                          {dbPreview.previewDoc.length.toLocaleString()} bp
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Topology: </span>
                        <span className="capitalize font-medium text-[var(--text)]">
                          {dbPreview.previewDoc.topology}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Type: </span>
                        <span className="font-mono font-medium text-[var(--text)]">
                          {dbPreview.previewDoc.alphabet}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Annotations: </span>
                        <span className="font-medium text-[var(--text)]">
                          {dbPreview.previewDoc.features.length} annotations
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between px-1">
                      <span>Source: <strong>{dbPreview.resolved.provider.toUpperCase()} ({dbPreview.resolved.format.toUpperCase()})</strong></span>
                      {dbPreview.resolved.organism && (
                        <span className="italic truncate max-w-[220px]">{dbPreview.resolved.organism}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                      <button
                        type="button"
                        onClick={() => setDbPreview(null)}
                        className="flex-1 py-1.5 rounded-md border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-muted)] text-[var(--text-secondary)] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDatabaseImport}
                        disabled={fetchingDb}
                        className="flex-1 py-1.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        {fetchingDb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Import</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div role="alert" className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {error}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
