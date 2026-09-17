/* Stance — "Import your own HR data" flow.
   Client uploads a CSV/Excel export → Claude proposes a column mapping to
   Sentinelle's internal schema → the user reviews/corrects it → confirmed
   rows are translated and sent through the existing /api/upload → Make
   pipeline, unchanged. Mapping never applies silently and required fields
   without a clear match always block confirmation until resolved. */
const { useState: iState, useRef: iRef, useEffect: iEffect } = React;

function readFileForImport(file) {
  const isExcel = /\.xlsx$|\.xls$/i.test(file.name);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    if (isExcel) {
      reader.onload = () => {
        const b64 = reader.result.split(',')[1] || '';
        resolve({ file_data: b64, filename: file.name });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => resolve({ file_data: reader.result, filename: file.name });
      reader.readAsText(file);
    }
  });
}

async function postJSON(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function MappingRow({ row, fields, onChange }) {
  const unresolved = !row.internalField;
  return (
    <tr className={unresolved ? 'imp-row-unresolved' : ''}>
      <td className="imp-col-src">{row.sourceColumn}</td>
      <td className="imp-col-sample">{String(row.sampleValue || '—')}</td>
      <td>
        <select value={row.internalField || ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">— Don't import this column —</option>
          {fields.map(f => <option key={f.key} value={f.key}>{f.key} ({f.tier})</option>)}
        </select>
      </td>
      <td className="imp-col-conf">{row.status === 'Reused' ? 'Saved mapping' : row.confidence ? row.confidence + '%' : '—'}</td>
    </tr>
  );
}

function ImportFlow({ onClose }) {
  const [step, setStep] = iState('pick'); // pick | analyzing | review | confirming | done
  const [error, setError] = iState(null);
  const [client, setClient] = iState(() => { try { return localStorage.getItem('stance-import-client') || ''; } catch (_) { return ''; } });
  const [fileMeta, setFileMeta] = iState(null); // { file_data, filename }
  const [mapping, setMapping] = iState([]);
  const [missingRequired, setMissingRequired] = iState([]);
  const [rowCount, setRowCount] = iState(0);
  const [fields, setFields] = iState([]);
  const fileInput = iRef(null);

  iEffect(() => {
    fetch('/api/import/fields').then(r => r.json()).then(setFields).catch(() => setFields([]));
  }, []);

  async function handleAnalyze() {
    const file = fileInput.current && fileInput.current.files[0];
    if (!file) { setError('Choose a CSV or Excel file first.'); return; }
    if (!client.trim()) { setError('Enter a client name — it lets Stance reuse this mapping on your next import.'); return; }

    setError(null);
    setStep('analyzing');
    try {
      const meta = await readFileForImport(file);
      setFileMeta(meta);
      try { localStorage.setItem('stance-import-client', client.trim()); } catch (_) {}

      const result = await postJSON('/api/import/mapping/suggest', { ...meta, client: client.trim() });
      setMapping(result.mapping);
      setMissingRequired(result.missingRequired);
      setRowCount(result.rowCount);
      setStep('review');
    } catch (err) {
      setError(err.message);
      setStep('pick');
    }
  }

  function updateMapping(index, internalField) {
    setMapping(prev => {
      const next = prev.map((r, i) => (i === index ? { ...r, internalField } : r));
      setMissingRequired(fields.filter(f => f.tier === 'required').map(f => f.key).filter(k => !next.some(r => r.internalField === k)));
      return next;
    });
  }

  async function handleConfirm() {
    if (missingRequired.length) { setError('Resolve every required field before importing.'); return; }
    setError(null);
    setStep('confirming');
    try {
      const payload = { ...fileMeta, client: client.trim(), mapping: mapping.map(({ sourceColumn, internalField }) => ({ sourceColumn, internalField })) };
      await postJSON('/api/import/mapping/confirm', payload);
      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('review');
    }
  }

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide">
        <div className="modal-top">
          <h3>Import your own HR data</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="imp-error">{error}</div>}

          {step === 'pick' && (
            <div className="imp-pick">
              <label className="imp-label">Client name</label>
              <input className="imp-input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Acme Corp" />
              <p className="imp-hint">Used to remember this client's column mapping across future imports — not a login, just a label.</p>

              <label className="imp-label">CSV or Excel file</label>
              <input ref={fileInput} type="file" accept=".csv,.xlsx,.xls" className="imp-file" />

              <button className="btn btn-primary" onClick={handleAnalyze}>Analyze columns</button>
            </div>
          )}

          {step === 'analyzing' && <div className="imp-loading">Reading the file and proposing a mapping…</div>}

          {step === 'review' && (
            <div className="imp-review">
              <p className="imp-hint">{rowCount} rows detected. Review the mapping below before anything is imported — nothing is applied silently.</p>

              {missingRequired.length > 0 && (
                <div className="imp-warning">
                  <b>Required fields not mapped:</b> {missingRequired.join(', ')} — pick a column for each, or the import stays blocked.
                </div>
              )}

              <table className="imp-table">
                <thead><tr><th>Detected column</th><th>Example</th><th>Maps to</th><th>Confidence</th></tr></thead>
                <tbody>
                  {mapping.map((row, i) => (
                    <MappingRow key={row.sourceColumn} row={row} fields={fields} onChange={(v) => updateMapping(i, v)} />
                  ))}
                </tbody>
              </table>

              <button className="btn btn-primary" disabled={missingRequired.length > 0} onClick={handleConfirm}>
                Confirm &amp; import {rowCount} rows
              </button>
            </div>
          )}

          {step === 'confirming' && <div className="imp-loading">Importing…</div>}

          {step === 'done' && (
            <div className="imp-done">
              <p>Your data has been sent for processing. It will appear in Sentinelle within a few minutes.</p>
              <button className="btn btn-primary" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.ImportFlow = ImportFlow;
