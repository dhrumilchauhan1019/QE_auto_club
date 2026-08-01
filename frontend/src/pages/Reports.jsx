import { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Input from '../components/common/Input.jsx';
import { Loader } from '../components/common/Loader.jsx';

export default function Reports() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState('daily');
  const [data, setData] = useState(null);

  async function load() {
    const { data } = await api.get('/reports/daily', { params: { date, period } });
    setData(data);
  }
  useEffect(() => { load(); }, [date, period]);

  if (!data) return <Loader label="Loading report..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-mist">Reports</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {['daily', 'weekly', 'monthly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs capitalize ${period === p ? 'bg-copper/10 text-copper border border-copper/30' : 'text-slate hover:text-mist'}`}>{p}</button>
            ))}
          </div>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
        </div>
      </div>

      <Card title="What happened today?"><p className="text-sm text-mist">{data.summary.whatHappened}</p></Card>

      <div className="grid grid-cols-4 gap-4">
        {[['Calls', data.calls], ['DMs Reached', data.decisionMakersReached], ['Proposals Sent', data.proposalsSent], ['Contracts Signed', data.contractsSigned]].map(([label, value]) => (
          <Card key={label}><div className="font-mono-data text-2xl text-mist">{value}</div><div className="text-slate text-xs mt-1">{label}</div></Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Revenue"><p className="text-sm text-mist">Contracted ${data.revenueContracted.toLocaleString()} · Collected ${data.revenueCollected.toLocaleString()}</p></Card>
        <Card title="Follow-up completion"><p className="text-sm text-mist">{data.followupsCompleted}/{data.followupsDue} completed today</p></Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <BreakdownCard title="Conversion by caller" data={data.conversionByCaller} />
        <BreakdownCard title="Conversion by industry" data={data.conversionByIndustry} />
        <BreakdownCard title="Conversion by tier" data={data.conversionByTier} />
      </div>

      <Card title="What is stuck?">
        {data.whatIsStuck.length === 0 ? <p className="text-slate text-sm">Nothing stuck — all active prospects have a next action.</p> : (
          <ul className="text-sm text-mist space-y-1">
            {data.whatIsStuck.map(p => <li key={p.id}>{p.businessName} — <span className="text-slate capitalize">{p.status.replace(/_/g, ' ')}</span></li>)}
          </ul>
        )}
      </Card>

      <Card title="Who is performing?"><p className="text-sm text-mist">{data.summary.whoIsPerforming}</p></Card>
      <Card title="What must happen tomorrow?"><p className="text-sm text-mist">{data.summary.whatMustHappenTomorrow}</p></Card>
    </div>
  );
}

function BreakdownCard({ title, data }) {
  const entries = Object.entries(data);
  return (
    <Card title={title}>
      {entries.length === 0 ? <p className="text-slate text-sm">No data.</p> : (
        <ul className="text-sm space-y-1">
          {entries.map(([key, value]) => (
            <li key={key} className="flex justify-between"><span className="text-mist capitalize">{key}</span><span className="text-copper font-mono-data">{value}</span></li>
          ))}
        </ul>
      )}
    </Card>
  );
}
