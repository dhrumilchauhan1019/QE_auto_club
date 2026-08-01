import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Table from '../components/common/Table.jsx';
import Button from '../components/common/Button.jsx';
import { Loader } from '../components/common/Loader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Contracts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  async function load() {
    const { data } = await api.get('/contracts');
    setItems(data);
  }
  useEffect(() => { load(); }, []);

  async function sign(id) {
    await api.patch(`/contracts/${id}/sign`, {});
    load();
  }

  if (!items) return <Loader label="Loading contracts..." />;
  const canSign = user.role === 'admin' || user.role === 'manager';

  const columns = [
    { key: 'business', label: 'Prospect', render: r => <span className="cursor-pointer hover:text-copper" onClick={() => navigate(`/prospects/${r.prospect.id}`)}>{r.prospect.businessName}</span> },
    { key: 'contractNumber', label: 'Contract #' },
    { key: 'amount', label: 'Amount', render: r => `$${r.amount.toLocaleString()}` },
    { key: 'status', label: 'Status', render: r => <span className="capitalize">{r.status.replace(/_/g, ' ')}</span> },
    { key: 'collected', label: 'Collected', render: r => `$${r.payments.reduce((s, p) => s + p.amount, 0).toLocaleString()}` },
    { key: 'actions', label: '', render: r => r.status === 'awaiting_signature' && canSign ? <Button variant="secondary" onClick={() => sign(r.id)}>Mark Signed</Button> : null }
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-mist">Contracts</h1>
      <Card><Table columns={columns} rows={items} emptyMessage="No contracts yet." /></Card>
    </div>
  );
}
