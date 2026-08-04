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
                {(l.previousValue || l.newValue) && (
                  <div className="mt-1 flex items-center gap-2 text-xs font-mono-data">
                    <span className="px-1.5 py-0.5 rounded bg-red-400/10 text-red-400 capitalize">{(l.previousValue || '—').replace(/_/g, ' ')}</span>
                    <span className="text-slate">→</span>
                    <span className="px-1.5 py-0.5 rounded bg-tierA/10 text-tierA capitalize">{(l.newValue || '—').replace(/_/g, ' ')}</span>
                  </div>
                )}
                <div className="text-slate text-xs mt-0.5">{new Date(l.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}