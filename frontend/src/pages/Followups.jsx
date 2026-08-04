import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Table from '../components/common/Table.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import Modal from '../components/common/Modal.jsx';
import { Loader, TierBadge } from '../components/common/Loader.jsx';
import StatusModal from '../components/common/StatusModal.jsx';

const TABS = [['overdue', 'Overdue'], ['due_today', 'Due Today'], ['upcoming', 'Upcoming']];
const TYPES = [{ value: 'call', label: 'Call' }, { value: 'email', label: 'Email' }, { value: 'presentation', label: 'Presentation' }];

export default function Followups() {
  const navigate = useNavigate();
  const [scope, setScope] = useState('overdue');
  const [items, setItems] = useState([]);
  const [widgets, setWidgets] = useState(null);
  const [loading, setLoading] = useState(true);

  const [target, setTarget] = useState(null);
  const [mode, setMode] = useState('add'); // 'add' | 'change'
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState('call');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusType, setStatusType] = useState('success');
  const [statusTitle, setStatusTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  function showStatus(t, title, message) {
    setStatusType(t);
    setStatusTitle(title);
    setStatusMessage(message);
    setStatusOpen(true);
  }

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

  // single click, no popup - just completes it and the row stays put, only the action
  // buttons disappear from that row
  async function handleMarkDone(row) {
    try {
      await api.patch(`/followups/${row.id}/complete`);
      setItems(prev => prev.map(i => i.id === row.id ? { ...i, completed: true } : i));
    } catch (err) {
      showStatus('error', 'Could Not Complete', err.response?.data?.error || 'Unable to mark this follow-up done.');
    }
  }

  function openFollowup(row) {
    setTarget(row);
    setMode('add');
    setDueDate('');
    setType(row.type || 'call');
    setNotes('');
    setError('');
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    if (next === 'change') {
      // prefill with the row's own current values for editing in place
      setDueDate(new Date(target.dueDate).toISOString().slice(0, 10));
      setType(target.type || 'call');
      setNotes(target.notes || '');
    } else {
      setDueDate('');
      setType(target.type || 'call');
      setNotes('');
    }
  }

  async function submitAddNew(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/followups', { prospectId: target.prospect.id, dueDate, type, notes });
      setTarget(null);
      showStatus('success', 'Follow-up Added', 'A new follow-up has been created for this prospect.');
      load();
    } catch (err) {
      showStatus('error', 'Could Not Add Follow-up', err.response?.data?.error || 'Unable to create the follow-up.');
    }
  }

  async function submitChangeExisting(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/followups/${target.id}`, { dueDate, type, notes });
      setTarget(null);
      showStatus('success', 'Follow-up Updated', 'The follow-up has been updated.');
      load();
    } catch (err) {
      showStatus('error', 'Could Not Update', err.response?.data?.error || 'Unable to update the follow-up.');
    }
  }

  const columns = [
    { key: 'business', label: 'Business', render: r => <span className="font-medium cursor-pointer hover:text-copper" onClick={() => navigate(`/prospects/${r.prospect.id}`)}>{r.prospect.businessName}</span> },
    { key: 'tier', label: 'Tier', render: r => <TierBadge tier={r.prospect.tier} /> },
    { key: 'type', label: 'Type', render: r => <span className="capitalize">{r.type}</span> },
    { key: 'dueDate', label: 'Due', render: r => new Date(r.dueDate).toLocaleDateString() },
    { key: 'notes', label: 'Notes', render: r => <span className="text-slate">{r.notes || '—'}</span> },
    {
      key: 'actions', label: '',
      render: r => r.completed ? (
        <span className="text-xs text-tierA">Done</span>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleMarkDone(r)}>Mark done</Button>
          <Button variant="secondary" onClick={() => openFollowup(r)}>Follow-up</Button>
        </div>
      )
    }
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

      <Modal open={!!target} onClose={() => setTarget(null)} title={`Follow-up — ${target?.prospect?.businessName || ''}`}>
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => switchMode('add')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm ${mode === 'add' ? 'bg-copper/10 text-copper border border-copper/30' : 'text-slate hover:text-mist border border-border'}`}
          >
            Add New Follow-up
          </button>
          <button
            type="button"
            onClick={() => switchMode('change')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm ${mode === 'change' ? 'bg-copper/10 text-copper border border-copper/30' : 'text-slate hover:text-mist border border-border'}`}
          >
            Change Existing Follow-up
          </button>
        </div>

        <form onSubmit={mode === 'add' ? submitAddNew : submitChangeExisting} className="space-y-3">
          <p className="text-xs text-slate">
            {mode === 'add' ? 'Creates a separate, additional follow-up for this prospect.' : "Edits this row's own date, type, and notes."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Due date" type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
            <Select label="Type" value={type} onChange={e => setType(e.target.value)} options={TYPES} />
          </div>
          <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <Button type="submit" className="w-full">{mode === 'add' ? 'Add Follow-up' : 'Save Changes'}</Button>
        </form>
      </Modal>

      <StatusModal
        open={statusOpen}
        type={statusType}
        title={statusTitle}
        message={statusMessage}
        buttonText="OK"
        onClose={() => setStatusOpen(false)}
      />
    </div>
  );
}