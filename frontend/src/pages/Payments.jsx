import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Table from '../components/common/Table.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import Modal from '../components/common/Modal.jsx';
import { Loader } from '../components/common/Loader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Payments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contractId: '', amount: '' });

  async function load() {
    const [{ data }, { data: c }] = await Promise.all([api.get('/payments'), api.get('/contracts')]);
    setItems(data);
    setContracts(c.filter(x => x.status === 'signed'));
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    const contract = contracts.find(c => c.id === form.contractId);
    await api.post('/payments', { prospectId: contract.prospectId, contractId: form.contractId, amount: Number(form.amount) });
    setOpen(false);
    setForm({ contractId: '', amount: '' });
    load();
  }

  if (!items) return <Loader label="Loading payments..." />;

  const collected = items.reduce((s, p) => s + p.amount, 0);
  const columns = [
    { key: 'business', label: 'Prospect', render: r => <span className="cursor-pointer hover:text-copper" onClick={() => navigate(`/prospects/${r.prospect.id}`)}>{r.prospect.businessName}</span> },
    { key: 'amount', label: 'Amount', render: r => `$${r.amount.toLocaleString()}` },
    { key: 'collectedAt', label: 'Collected', render: r => new Date(r.collectedAt).toLocaleDateString() }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-mist">Payments</h1>
          <p className="text-slate text-sm mt-1">Collected revenue: <span className="text-copper font-mono-data">${collected.toLocaleString()}</span></p>
        </div>
        {(user.role === 'admin' || user.role === 'finance') && <Button onClick={() => setOpen(true)}>Record Payment</Button>}
      </div>

      <Card><Table columns={columns} rows={items} emptyMessage="No payments recorded yet." /></Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Record Payment">
        <form onSubmit={submit} className="space-y-3">
          <Select label="Contract" required value={form.contractId} onChange={e => setForm({ ...form, contractId: e.target.value })}
            options={[{ value: '', label: 'Select signed contract' }, ...contracts.map(c => ({ value: c.id, label: `${c.contractNumber} — $${c.amount.toLocaleString()}` }))]} />
          <Input label="Amount" type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          <Button type="submit" className="w-full">Record</Button>
        </form>
      </Modal>
    </div>
  );
}
