import { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import { Loader } from '../components/common/Loader.jsx';

export default function Settings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.get('/settings').then(r => setForm(r.data)); }, []);

  async function save(e) {
    e.preventDefault();
    await api.put('/settings', { companyName: form.companyName });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!form) return <Loader label="Loading settings..." />;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-display text-2xl text-mist">Settings</h1>

      <Card title="Company Information">
        <form onSubmit={save} className="space-y-3">
          <Input label="Company name" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
          <Button type="submit">{saved ? 'Saved ✓' : 'Save'}</Button>
        </form>
      </Card>

      <Card title="Call Outcome List">
        <p className="text-slate text-sm">{form.callOutcomes.split(',').join(', ')}</p>
      </Card>

      <Card title="Pipeline Stages">
        <p className="text-slate text-sm">{form.pipelineStages.split(',').join(' → ')}</p>
      </Card>
    </div>
  );
}
