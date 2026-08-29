'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Check, FileSpreadsheet, Import, RotateCcw, ShieldCheck, Upload } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { api, enrichLibraryMetadata } from '@/lib/client/api';
import type { GoodreadsNormalizedRow, ImportSummary } from '@/lib/domain/types';
import { parseGoodreadsCsv, summarizeGoodreadsRows } from '@/lib/import/goodreads';

const IMPORT_CHUNK_SIZE = 20;

export function GoodreadsImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<GoodreadsNormalizedRow[]>([]);
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [undone, setUndone] = useState(false);
  const [error, setError] = useState('');
  const counts = useMemo(() => summarizeGoodreadsRows(rows), [rows]);

  const readFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setSummary(null);
    setUndone(false);
    try {
      const parsed = parseGoodreadsCsv(await file.text());
      setRows(parsed);
      setFileName(file.name);
      setConfirmed(new Set());
      if (!parsed.length) setError('The export did not contain any book rows.');
    } catch (caught) {
      setRows([]);
      setFileName('');
      setError(caught instanceof Error ? caught.message : 'The CSV could not be read.');
    }
  };

  const startImport = async () => {
    const prepared = rows.map((row) => row.status === 'needs-review' && confirmed.has(row.rowNumber)
      ? { ...row, status: 'ready' as const, confirmedTitleAuthor: true, issues: [...row.issues, 'Title and author confirmed by reader.'] }
      : row);
    const eligible = prepared.filter((row) => row.status === 'ready');
    if (!eligible.length) {
      setError('Confirm at least one usable row before importing.');
      return;
    }
    setBusy(true);
    setError('');
    setProgress(0);
    let jobId: string | undefined;
    let latestSummary: ImportSummary | null = null;
    try {
      const firstRow = prepared[0];
      const started = await api.importChunk({
        totalRows: prepared.length,
        rows: [],
        finalize: false,
        resumeRowNumber: firstRow.rowNumber,
        resumeFingerprint: firstRow.fingerprint,
      });
      jobId = started.summary.jobId;
      latestSummary = started.summary;
      for (let index = 0; index < prepared.length; index += IMPORT_CHUNK_SIZE) {
        const chunk = prepared.slice(index, index + IMPORT_CHUNK_SIZE);
        const result = await api.importChunk({
          jobId,
          totalRows: prepared.length,
          rows: chunk,
          finalize: index + chunk.length >= prepared.length,
        });
        jobId = result.summary.jobId;
        latestSummary = result.summary;
        setProgress(Math.round(((index + chunk.length) / prepared.length) * 100));
      }
      setSummary(latestSummary);
      if (latestSummary?.imported) await enrichLibraryMetadata().catch(() => undefined);
      await onImported();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The import stopped before it finished. Reopening the same file is safe.');
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!summary) return;
    setBusy(true);
    setError('');
    try {
      await api.undoImport(summary.jobId);
      setUndone(true);
      await onImported();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The imported books could not be undone.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Import from Goodreads" eyebrow="CSV migration" onClose={onClose} wide footer={
      summary ? (
        <div className="dialog-footer-actions">
          <span>{undone ? 'This import has been undone.' : 'Only books added by this job will be removed.'}</span>
          <button className="secondary-action" type="button" disabled={busy || undone} onClick={() => void undo()}><RotateCcw aria-hidden="true" />Undo this import</button>
        </div>
      ) : (
        <div className="dialog-footer-actions">
          <span>The raw CSV stays in this browser. Only confirmed, normalized book records are sent.</span>
          <button className="primary-action" type="button" disabled={busy || !rows.length} onClick={() => void startImport()}><Import aria-hidden="true" />{busy ? `Importing ${progress}%` : 'Import confirmed books'}</button>
        </div>
      )
    }>
      {!summary && (
        <>
          <label className="file-drop">
            <input type="file" accept=".csv,text/csv" onChange={(event) => void readFile(event.target.files?.[0])} />
            <Upload aria-hidden="true" />
            <span><strong>{fileName || 'Choose your Goodreads export'}</strong><small>CSV only · up to 15 MB and 10,000 rows</small></span>
          </label>
          <div className="privacy-note"><ShieldCheck aria-hidden="true" /><p>Parsing happens locally. My Book Nook does not scrape Goodreads or upload the original file.</p></div>

          {rows.length > 0 && (
            <section className="import-preview" aria-labelledby="import-preview-title">
              <div className="import-summary-cards">
                <div><strong>{counts.ready}</strong><span><Check aria-hidden="true" />Ready</span></div>
                <div><strong>{counts['needs-review']}</strong><span><AlertCircle aria-hidden="true" />Needs review</span></div>
                <div><strong>{counts.skipped}</strong><span>Skipped</span></div>
              </div>
              <div className="section-inline-heading"><h3 id="import-preview-title">Preview</h3><span>{rows.length} rows from {fileName}</span></div>
              <div className="import-table-wrap">
                <table className="import-table">
                  <thead><tr><th>Status</th><th>Book</th><th>Rating</th><th>Read</th><th>Include</th></tr></thead>
                  <tbody>
                    {rows.slice(0, 250).map((row) => {
                      const canConfirm = row.status === 'needs-review';
                      const included = row.status === 'ready' || confirmed.has(row.rowNumber);
                      return (
                        <tr key={`${row.rowNumber}-${row.fingerprint}`}>
                          <td><span className={`status-pill status-${row.status}`}>{row.status.replace('-', ' ')}</span></td>
                          <td><strong>{row.title || 'Missing title'}</strong><small>{row.author || 'Missing author'}{row.issues[0] ? ` · ${row.issues[0]}` : ''}</small></td>
                          <td>{row.rating ? `${row.rating}/5` : '—'}</td>
                          <td>{row.dateRead || row.exclusiveShelf || '—'}</td>
                          <td>
                            {canConfirm ? <label className="table-check"><input type="checkbox" checked={included} onChange={() => setConfirmed((current) => { const next = new Set(current); if (next.has(row.rowNumber)) next.delete(row.rowNumber); else next.add(row.rowNumber); return next; })} /><span className="sr-only">Confirm {row.title}</span></label> : included ? <Check aria-label="Included" /> : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length > 250 && <p className="table-note">Showing the first 250 rows. All {rows.length} normalized rows will be processed.</p>}
              </div>
            </section>
          )}
        </>
      )}

      {summary && (
        <section className="import-result">
          <FileSpreadsheet aria-hidden="true" />
          <span className="eyebrow">Import report</span>
          <h3>{undone ? 'Import undone' : `${summary.imported} book${summary.imported === 1 ? '' : 's'} added`}</h3>
          <p>{summary.unchanged} unchanged · {summary.conflicts} protected conflict{summary.conflicts === 1 ? '' : 's'} · {summary.skipped} skipped</p>
          {summary.conflicts > 0 && <p className="result-note">Existing or user-edited reviews were preserved. Imported differences were recorded for a future conflict review screen.</p>}
          <button className="primary-action" type="button" onClick={onClose}>Back to my library</button>
        </section>
      )}
      {busy && <div className="progress-track" aria-label={`Import ${progress}% complete`}><span style={{ width: `${progress}%` }} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Dialog>
  );
}
