import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Table from '../components/common/Table.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import Button from '../components/common/Button.jsx';
import { Loader, TierBadge, StatusPill } from '../components/common/Loader.jsx';
import Modal from '../components/common/Modal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const STAGES = ['', 'lead', 'contacted', 'decision_maker_reached', 'appointment', 'presentation', 'proposal', 'contract', 'payment', 'completed', 'closed_lost', 'do_not_contact'];
const EMPTY_FORM = { businessName: '', industry: '', decisionMaker: '', decisionMakerPosition: '', phone: '', email: '', vehicleCount: '', location: '', city: '', state: '', zip: '' };

export default function Prospects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/prospects', { params: { search, tier, status, pageSize: 100 } });
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  }
  useEffect(() => { load(); }, [search, tier, status]);

  async function handleCreate(e) {
    e.preventDefault();
    await api.post('/prospects', form);
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    load();
  }

  function openEdit(row) {
    setEditId(row.id);
    setEditForm({
      businessName: row.businessName || '', industry: row.industry || '', decisionMaker: row.decisionMaker || '',
      decisionMakerPosition: row.decisionMakerPosition || '', phone: row.phone || '', email: row.email || '',
      vehicleCount: row.vehicleCount ?? '', location: row.location || '', city: row.city || '', state: row.state || '', zip: row.zip || ''
    });
  }

  async function handleEditSave(e) {
    e.preventDefault();
    await api.put(`/prospects/${editId}`, editForm);
    setEditId(null);
    load();
  }

  async function handleDelete(row) {
    if (!confirm(`Permanently delete ${row.businessName}? This cannot be undone. Consider using Archive on the prospect page instead.`)) return;
    await api.delete(`/prospects/${row.id}`);
    load();
  }

  async function exportCsv() {
    const res = await api.get('/prospects/export', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'prospects_export.csv'; a.click();
  }

  const canEdit = user.role === 'admin' || user.role === 'manager';
  const canDelete = user.role === 'admin';

  const columns = [
    { key: 'businessName', label: 'Business', render: r => <span className="font-medium">{r.businessName}</span> },
    { key: 'tier', label: 'Tier', render: r => <TierBadge tier={r.overrideTier || r.tier} /> },
    { key: 'score', label: 'Score' },
    { key: 'status', label: 'Status', render: r => <StatusPill status={r.status} /> },
    { key: 'vehicleCount', label: 'Vehicles' },
    { key: 'assignedCaller', label: 'Caller', render: r => r.assignedCaller?.name || '—' },
    { key: 'nextAction', label: 'Next Action', render: r => <span className="text-slate">{r.nextAction || '—'}</span> }
  ];

  if (canEdit || canDelete) {
    columns.push({
      key: 'actions', label: '',
      render: r => (
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          {canEdit && <button onClick={() => openEdit(r)} className="text-xs text-slate hover:text-copper">Edit</button>}
          {canDelete && <button onClick={() => handleDelete(r)} className="text-xs text-slate hover:text-red-400">Delete</button>}
        </div>
      )
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-mist">Prospects</h1>
          <p className="text-slate text-sm mt-1">{total} total records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}>Export</Button>
          {canEdit && <Button onClick={() => setCreateOpen(true)}>+ New Prospect</Button>}
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Input placeholder="Search business, contact, phone, email..." value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={tier} onChange={e => setTier(e.target.value)} options={[{ value: '', label: 'All tiers' }, { value: 'A', label: 'Tier A' }, { value: 'B', label: 'Tier B' }, { value: 'C', label: 'Tier C' }]} />
          <Select value={status} onChange={e => setStatus(e.target.value)} options={STAGES.map(s => ({ value: s, label: s ? s.replace(/_/g, ' ') : 'All statuses' }))} />
        </div>
        {loading ? <Loader /> : <Table columns={columns} rows={items} onRowClick={r => navigate(`/prospects/${r.id}`)} />}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Prospect">
        <form onSubmit={handleCreate} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <Input label="Business name" required value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} />
          <Input label="Industry" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Decision maker" value={form.decisionMaker} onChange={e => setForm({ ...form, decisionMaker: e.target.value })} />
            <Input label="Position" value={form.decisionMakerPosition} onChange={e => setForm({ ...form, decisionMakerPosition: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vehicle count" type="number" value={form.vehicleCount} onChange={e => setForm({ ...form, vehicleCount: e.target.value })} />
            <Input label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            <Input label="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
            <Input label="ZIP" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
          </div>
          <Button type="submit" className="w-full mt-2">Create Prospect</Button>
        </form>
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Edit Prospect">
        <form onSubmit={handleEditSave} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <Input label="Business name" required value={editForm.businessName} onChange={e => setEditForm({ ...editForm, businessName: e.target.value })} />
          <Input label="Industry" value={editForm.industry} onChange={e => setEditForm({ ...editForm, industry: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Decision maker" value={editForm.decisionMaker} onChange={e => setEditForm({ ...editForm, decisionMaker: e.target.value })} />
            <Input label="Position" value={editForm.decisionMakerPosition} onChange={e => setEditForm({ ...editForm, decisionMakerPosition: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="Email" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vehicle count" type="number" value={editForm.vehicleCount} onChange={e => setEditForm({ ...editForm, vehicleCount: e.target.value })} />
            <Input label="Location" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="City" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
            <Input label="State" value={editForm.state} onChange={e => setEditForm({ ...editForm, state: e.target.value })} />
            <Input label="ZIP" value={editForm.zip} onChange={e => setEditForm({ ...editForm, zip: e.target.value })} />
          </div>
          <Button type="submit" className="w-full mt-2">Save Changes</Button>
        </form>
      </Modal>
    </div>
  );
}
