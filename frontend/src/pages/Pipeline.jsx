import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Loader, TierBadge } from '../components/common/Loader.jsx';

const LABELS = {
  lead: 'Lead', contacted: 'Contacted', decision_maker_reached: 'Decision Maker Reached',
  appointment: 'Appointment', presentation: 'Presentation', proposal: 'Proposal',
  contract: 'Contract', payment: 'Payment', completed: 'Completed'
};

export default function Pipeline() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  async function load() {
    const { data } = await api.get('/board');
    setData(data);
  }
  useEffect(() => { load(); }, []);

  async function drop(stage) {
    setDragOver(null);
    if (!dragId) return;
    await api.patch(`/board/${dragId}/move`, { status: stage });
    setDragId(null);
    load();
  }

  if (!data) return <Loader label="Loading pipeline..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-mist">Pipeline Board</h1>
        <p className="text-slate text-sm mt-1">Drag a card to move a prospect between stages</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {data.stages.map(stage => (
          <div
            key={stage}
            className={`kanban-col panel p-3 flex-shrink-0 ${dragOver === stage ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(stage); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => drop(stage)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wide text-slate">{LABELS[stage]}</span>
              <span className="text-xs text-copper font-mono-data">{data.columns[stage].length}</span>
            </div>
            <div className="space-y-2 min-h-[40px]">
              {data.columns[stage].map(p => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => setDragId(p.id)}
                  onClick={() => navigate(`/prospects/${p.id}`)}
                  className="kanban-card bg-ink border border-border rounded-lg p-3 text-sm hover:border-copper/40"
                >
                  <div className="text-mist font-medium truncate">{p.businessName}</div>
                  <div className="flex items-center justify-between mt-2">
                    <TierBadge tier={p.tier} />
                    <span className="text-slate text-xs font-mono-data">{p.score}</span>
                  </div>
                  {p.assignedCaller && <div className="text-slate text-xs mt-1 truncate">{p.assignedCaller.name}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
