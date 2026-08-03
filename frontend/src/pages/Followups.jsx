import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Table from '../components/common/Table.jsx';
import Input from '../components/common/Input.jsx';
import Modal from '../components/common/Modal.jsx';
import { Loader, TierBadge } from '../components/common/Loader.jsx';

const TABS = [['overdue', 'Overdue'], ['due_today', 'Due Today'], ['upcoming', 'Upcoming']];

export default function Followups() {
  const navigate = useNavigate();
  const [scope, setScope] = useState('overdue');
  const [items, setItems] = useState([]);
  const [widgets, setWidgets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [resultNotes, setResultNotes] = useState('');
  const [needsNext, setNeedsNext] = useState(false);
  const [nextDueDate, setNextDueDate] = useState('');
  const [nextNotes, setNextNotes] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const [{ data }, { data: w }] = await Promise.all([
      api.get('/followups', { params: { scope } }),
      api.get('/followups/widgets/summary')
    ]);
    setItems(data);
    setWidgets(w);
    setLoading(false);
  }
  useEffect(() => { load(); }, [scope]);

  function openComplete(row) {
    setTarget(row);
    setResultNotes(''); setNextDueDate(''); setNextNotes(''); setError('');
    setNeedsNext(!['completed', 'closed_lost', 'do_not_contact'].includes(row.prospect.status));
  }

  async function submitComplete(e) {
    e.preventDefault();
    setError('');
    try {
      await api.patch(`/followups/${target.id}/complete`, { resultNotes, nextDueDate: nextDueDate || undefined, nextNotes });
      setTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not complete this follow-up.');
    }
  }

  const columns = [
    { key: 'business', label: 'Business', render: r => <span className="font-medium cursor-pointer hover:text-copper" onClick={() => navigate(`/prospects/${r.prospect.id}`)}>{r.prospect.businessName}</span> },
    { key: 'tier', label: 'Tier', render: r => <TierBadge tier={r.prospect.tier} /> },
    { key: 'type', label: 'Type', render: r => <span className="capitalize">{r.type}</span> },
    { key: 'dueDate', label: 'Due', render: r => new Date(r.dueDate).toLocaleDateString() },
    { key: 'notes', label: 'Notes', render: r => <span className="text-slate">{r.notes || '—'}</span> },
    { key: 'actions', label: '', render: r => <Button variant="secondary" onClick={() => openComplete(r)}>Mark done</Button> }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-mist">Follow-up Manager</h1>
        <p className="text-slate text-sm mt-1">Prevent revenue leakage from missed actions</p>
      </div>

      {widgets && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[['Due Today', widgets.dueToday], ['Overdue', widgets.overdue], ['Upcoming Meetings', widgets.upcomingMeetings], ['Pending Proposal', widgets.pendingProposals], ['Pending Contract', widgets.pendingContracts], ['Pending Payment', widgets.pendingPayments]].map(([l, v]) => (
            <Card key={l}><div className="font-mono-data text-xl text-mist">{v}</div><div className="text-slate text-xs mt-1">{l}</div></Card>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {TABS.map(([value, label]) => (
          <button key={value} onClick={() => setScope(value)} className={`px-4 py-2 rounded-lg text-sm ${scope === value ? 'bg-copper/10 text-copper border border-copper/30' : 'text-slate hover:text-mist'}`}>{label}</button>
        ))}
      </div>

      <Card>{loading ? <Loader /> : <Table columns={columns} rows={items} emptyMessage="Nothing here — you're caught up." />}</Card>

      <Modal open={!!target} onClose={() => setTarget(null)} title={`Complete follow-up — ${target?.prospect?.businessName || ''}`}>
        <form onSubmit={submitComplete} className="space-y-3">
          <Input label="What happened? (required)" required value={resultNotes} onChange={e => setResultNotes(e.target.value)} />
          {needsNext ? (
            <>
              <p className="text-xs text-slate">This opportunity is still active — set the next follow-up before you can complete this one.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Next follow-up date (required)" type="date" required value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} />
                <Input label="Next action note" value={nextNotes} onChange={e => setNextNotes(e.target.value)} />
              </div>
            </>
          ) : (
            <p className="text-xs text-slate">This prospect is closed, so no further follow-up is required.</p>
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <Button type="submit" className="w-full">Complete Follow-up</Button>
        </form>
      </Modal>
    </div>
  );
}