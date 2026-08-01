import { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import { Loader } from '../components/common/Loader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [widgets, setWidgets] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/dashboard'), api.get('/followups/widgets/summary')])
      .then(([d, w]) => { setData(d.data); setWidgets(w.data); })
      .catch(err => setError(err.response?.data?.error || 'Failed to load dashboard'));
  }, []);

  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (!data || !widgets) return <Loader label="Loading dashboard..." />;

  const { campaign, prospects, funnel, revenue, activity, callers } = data;
  const salesPct = Math.min(100, revenue.salesPct);
  const heading = user.role === 'caller' ? 'My Dashboard' : user.role === 'manager' ? 'Team Dashboard' : 'Stewardship Campaign';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-mist">{heading}</h1>
        {user.role !== 'caller' && (
          <p className="text-slate text-sm mt-1">
            {campaign.targetProspects.toLocaleString()} prospects · target {campaign.targetSales} sales · ${campaign.minContractValue.toLocaleString()} minimum contract
          </p>
        )}
      </div>

      <Card title="Progress toward 240 sales">
        <div className="flex items-end justify-between mb-2">
          <span className="font-mono-data text-3xl text-mist">{revenue.salesProgress}<span className="text-slate text-lg">/{revenue.salesTarget}</span></span>
          <span className="text-copper font-mono-data text-sm">{salesPct}%</span>
        </div>
        <div className="w-full h-2 bg-ink rounded-full overflow-hidden"><div className="h-full copper-rail" style={{ width: `${salesPct}%` }} /></div>
        <div className="grid grid-cols-2 gap-4 mt-5 text-sm">
          <div><span className="text-slate">Contracted revenue</span><div className="font-mono-data text-mist text-lg">${revenue.totalContracted.toLocaleString()}</div></div>
          <div><span className="text-slate">Collected revenue</span><div className="font-mono-data text-mist text-lg">${revenue.totalCollected.toLocaleString()}</div></div>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card title="Prospects"><div className="font-mono-data text-3xl text-mist">{prospects.total}</div></Card>
        <Card title="Tier A / B / C">
          <div className="flex gap-4 font-mono-data text-lg">
            <span className="text-tierA">{prospects.tierA}</span><span className="text-tierB">{prospects.tierB}</span><span className="text-tierC">{prospects.tierC}</span>
          </div>
        </Card>
        <Card title="Calls Today"><div className="font-mono-data text-3xl text-mist">{activity.callsToday}</div></Card>
        {callers !== null ? (
          <Card title="Active Callers"><div className="font-mono-data text-3xl text-mist">{callers}</div></Card>
        ) : (
          <Card title="Decision Makers Reached"><div className="font-mono-data text-3xl text-mist">{activity.decisionMakersReached}</div></Card>
        )}
      </div>

      <Card title="Funnel">
        <div className="grid grid-cols-4 gap-3 text-center text-sm">
          {[['Appointments', funnel.appointments], ['Presentations', funnel.presentations], ['Proposals Sent', funnel.proposalsSent], ['Contracts Signed', funnel.contractsSigned]].map(([label, value]) => (
            <div key={label} className="bg-ink rounded-lg py-4">
              <div className="font-mono-data text-xl text-mist">{value}</div>
              <div className="text-slate text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[['Due Today', widgets.dueToday], ['Overdue', widgets.overdue], ['Upcoming Meetings', widgets.upcomingMeetings], ['Pending Proposals', widgets.pendingProposals], ['Pending Contracts', widgets.pendingContracts], ['Pending Payments', widgets.pendingPayments]].map(([label, value]) => (
          <Card key={label}><div className="font-mono-data text-2xl text-mist">{value}</div><div className="text-slate text-xs mt-1">{label}</div></Card>
        ))}
      </div>
    </div>
  );
}
