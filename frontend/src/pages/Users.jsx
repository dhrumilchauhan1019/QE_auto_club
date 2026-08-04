import { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Table from '../components/common/Table.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import Modal from '../components/common/Modal.jsx';
import { Loader } from '../components/common/Loader.jsx';
import StatusModal from '../components/common/StatusModal.jsx';

const ROLES = [
  { value: 'caller', label: 'Caller' },
  { value: 'closer', label: 'Closer' },
  { value: 'finance', label: 'Finance' },
  { value: 'manager', label: 'Sales Manager' },
  { value: 'executive', label: 'Executive' },
  { value: 'admin', label: 'Admin' }
];
const EMPTY_CREATE = { name: '', email: '', password: '', role: 'caller' };
const EMPTY_EDIT = { name: '', email: '', role: 'caller', phone: '', password: '' };

export default function Users() {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_CREATE);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);

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
    const { data } = await api.get('/users');
    setItems(data);
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setOpen(false);
      setForm(EMPTY_CREATE);
      showStatus('success', 'User Created', 'The new user account has been created.');
      load();
    } catch (err) {
      showStatus('error', 'Could Not Create User', err.response?.data?.error || 'Unable to create this user.');
    }
  }

  function openEdit(user) {
    setEditId(user.id);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'caller',
      password: ''
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    const payload = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      role: editForm.role
    };
    if (editForm.password) payload.password = editForm.password;
    try {
      await api.put(`/users/${editId}`, payload);
      setEditId(null);
      showStatus('success', 'User Updated', 'Changes have been saved.');
      load();
    } catch (err) {
      showStatus('error', 'Could Not Save Changes', err.response?.data?.error || 'Unable to update this user.');
    }
  }

  async function toggleActive(u) {
    try {
      await api.put(`/users/${u.id}`, { active: !u.active });
      showStatus('success', u.active ? 'User Disabled' : 'User Enabled', `${u.name} has been ${u.active ? 'disabled' : 'enabled'}.`);
      load();
    } catch (err) {
      showStatus('error', 'Could Not Update Status', err.response?.data?.error || 'Unable to change this user\'s status.');
    }
  }

  if (!items) return <Loader label="Loading users..." />;

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: r => <span className="capitalize">{r.role}</span> },
    { key: 'active', label: 'Status', render: r => <span className={r.active ? 'text-tierA' : 'text-slate'}>{r.active ? 'Active' : 'Disabled'}</span> },
    {
      key: 'actions', label: '',
      render: r => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(r)} className="text-xs text-slate hover:text-copper">Edit</button>
          <Button variant="secondary" onClick={() => toggleActive(r)}>{r.active ? 'Disable' : 'Enable'}</Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="font-display text-2xl text-mist">User Management</h1>
        <Button onClick={() => setOpen(true)}>+ Add User</Button>
      </div>
      <Card><Table columns={columns} rows={items} /></Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add User">
        <form onSubmit={submit} className="space-y-3">
          <Input label="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Select label="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={ROLES} />
          <Button type="submit" className="w-full">Create</Button>
        </form>
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Edit User">
        <form onSubmit={saveEdit} className="space-y-3">
          <Input label="Name" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Email" type="email" value={editForm.email} disabled />
          <Input label="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
          <Select label="Role" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} options={ROLES} />
          <Input label="New password (leave blank to keep current)" type="text" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
          <Button type="submit" className="w-full">Save Changes</Button>
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