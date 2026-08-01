import { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import { Loader } from '../components/common/Loader.jsx';

export default function ActivityLogs() {
  const [logs, setLogs] = useState(null);

  useEffect(() => { api.get('/activity-logs').then(r => setLogs(r.data)); }, []);

  if (!logs) return <Loader label="Loading activity..." />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-mist">Activity History</h1>
      <Card>
        {logs.length === 0 ? <p className="text-slate text-sm">Nothing logged yet.</p> : (
          <ul className="space-y-3">
            {logs.map(l => (
              <li key={l.id} className="text-sm border-l-2 border-border pl-3">
                <span className="text-mist">{l.user?.name || 'System'}</span>
                <span className="text-slate"> — {l.action.replace(/_/g, ' ')} {l.entityType}</span>
                {l.details && <span className="text-slate"> ({l.details})</span>}
                <div className="text-slate text-xs mt-0.5">{new Date(l.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
