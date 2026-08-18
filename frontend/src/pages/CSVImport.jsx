import { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Select from '../components/common/Select.jsx';
import { Loader } from '../components/common/Loader.jsx';
import StatusModal from '../components/common/StatusModal.jsx';
import Modal from '../components/common/Modal.jsx';

const FIELDS = [
  { value: '', label: 'Do not import' },
  { value: 'businessName', label: 'Business name (required)' },
  { value: 'industry', label: 'Industry' },
  { value: 'website', label: 'Website' },
  { value: 'decisionMaker', label: 'Decision maker' },
  { value: 'decisionMakerPosition', label: 'Decision maker title' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'vehicleCount', label: 'Vehicle count' },
  { value: 'location', label: 'Location' },
  { value: 'city', label: 'City' },
  { value: 'county', label: 'County' },
  { value: 'currentArrangement', label: 'Current arrangement' },
  { value: 'leadSource', label: 'Lead source' },
  { value: 'tier', label: 'Tier (A/B/C)' },
  { value: 'score', label: 'Score (0-100)' },
  { value: 'status', label: 'Status / stage' },
  { value: 'nextAction', label: 'Next action' },
  { value: 'assignedCaller', label: 'Assigned caller (by name)' },
  { value: 'qualificationEvidence', label: 'Qualification evidence' },
  { value: 'verificationStatus', label: 'Verification status' },
  { value: 'recommendedOutreachAngle', label: 'Recommended outreach angle' },
  { value: 'primarySourceUrl', label: 'Primary source URL' },
  { value: 'researchDate', label: 'Research date' },
  { value: 'linkedinUrl', label: 'LinkedIn URL' },
  { value: 'notes', label: 'Notes' }
];

export default function CSVImport() {
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusType, setStatusType] = useState("success");
  const [statusTitle, setStatusTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { api.get('/csv/history').then(r => setHistory(r.data)); }, []);

  function showStatus(type, title, message) {
    setStatusType(type);
    setStatusTitle(title);
    setStatusMessage(message);
    setStatusOpen(true);
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/csv/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setPreview(data);
    setMapping(data.suggestedMapping);
    setLoading(false);
  }

  async function handleImport() {
    try {

      setLoading(true);

      const { data } = await api.post("/csv/import", {
        rows: preview.allRows,
        mapping,
        filename: preview.filename,
      });

      setResult(data);

      showStatus(
        "success",
        "Import Completed",
        `${data.success} prospects imported successfully.`
      );

    } catch (err) {

      showStatus(
        "error",
        "Import Failed",
        err.response?.data?.error || "Unable to import CSV."
      );

    } finally {

      setLoading(false);

    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl text-mist">CSV Import</h1>
          <p className="text-slate text-sm mt-1">Import the 1,000-prospect campaign spreadsheet (or a sanitized copy).</p>
        </div>

        {!preview && (
          <Card>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-steelLight rounded-lg py-16 cursor-pointer hover:border-copper/50 transition-colors">
              <span className="text-mist text-sm mb-1">Click to select a .csv file</span>
              <span className="text-slate text-xs">Column mapping and duplicate detection run automatically</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleUpload} />
            </label>
            {loading && <Loader label="Parsing file..." />}
          </Card>
        )}

        {preview && !result && (
          <>
            <Card title={`Column mapping (${preview.rowCount} rows detected)`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {preview.headers.map(h => (
                  <div key={h} className="flex items-center gap-3">
                    <span className="text-mist text-sm w-32 truncate" title={h}>{h}</span>
                    <Select
                      value={mapping[h] || ''}
                      onChange={e => setMapping({ ...mapping, [h]: e.target.value })}
                      options={FIELDS}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Preview (first 5 rows)">
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead><tr>{preview.headers.map(h => <th key={h} className="text-left text-slate px-2 py-1">{h}</th>)}</tr></thead>
                  <tbody>
                    {preview.sampleRows.map((row, i) => (
                      <tr key={i} className="border-t border-steelLight/50">
                        {preview.headers.map(h => <td key={h} className="px-2 py-1 text-mist">{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={loading}>{loading ? 'Importing...' : `Import ${preview.rowCount} Rows`}</Button>
              <Button variant="secondary" onClick={() => setConfirmOpen(true)}>Cancel</Button>
            </div>
          </>
        )}

        {result && (
          <Card title="Import summary">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 text-center">
              <div className="bg-ink rounded-lg py-4"><div className="text-tierA font-mono-data text-2xl">{result.success}</div><div className="text-slate text-xs mt-1">Imported</div></div>
              <div className="bg-ink rounded-lg py-4"><div className="text-tierB font-mono-data text-2xl">{result.duplicates}</div><div className="text-slate text-xs mt-1">Duplicates skipped</div></div>
              <div className="bg-ink rounded-lg py-4"><div className="text-red-400 font-mono-data text-2xl">{result.failed}</div><div className="text-slate text-xs mt-1">Failed validation</div></div>
            </div>
            {result.errors.length > 0 && (
              <div>
                <h4 className="text-mist text-sm mb-2">Rows needing attention</h4>
                <ul className="space-y-1 max-h-64 overflow-y-auto text-xs">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-slate">Row {e.row}: <span className="text-red-400">{e.errors.join('; ')}</span></li>
                  ))}
                </ul>
              </div>
            )}
            <Button className="mt-4" onClick={() => { setPreview(null); setResult(null); }}>Import Another File</Button>
          </Card>
        )}
        {!preview && history.length > 0 && (
          <Card title="Recent imports">
            <ul className="text-sm space-y-2">
              {history.map(h => (
                <li key={h.id} className="flex justify-between text-slate">
                  <span className="text-mist">{h.filename}</span>
                  <span>{h.successCount} imported, {h.duplicateCount} dup, {h.failedCount} failed — {new Date(h.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <StatusModal
        open={statusOpen}
        type={statusType}
        title={statusTitle}
        message={statusMessage}
        buttonText="OK"
        onClose={() => setStatusOpen(false)}
      />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cancel Import?"
      >
        <p className="text-slate mb-6">
          Any unsaved mapping changes will be lost.
        </p>

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
          >
            No
          </Button>

          <Button
            onClick={() => {
              setPreview(null);
              setResult(null);
              setConfirmOpen(false);

              showStatus(
                "",
                "Cancelled",
                "Import process cancelled."
              );
            }}
          >
            Yes, Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}