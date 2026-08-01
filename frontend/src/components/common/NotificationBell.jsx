import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  async function load() {
    const { data } = await api.get('/notifications');
    setItems(data);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onClick);
    return () => { clearInterval(t); document.removeEventListener('click', onClick); };
  }, []);

  const unread = items.filter(n => !n.read).length;

  async function readAll() {
    await api.patch('/notifications/read-all');
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="relative text-slate hover:text-mist px-2">
        🔔
        {unread > 0 && <span className="absolute -top-1 -right-1 bg-copper text-ink text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 panel p-3 z-50 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-mist text-sm font-display">Notifications</span>
            {unread > 0 && <button onClick={readAll} className="text-xs text-copper">Mark all read</button>}
          </div>
          {items.length === 0 && <p className="text-slate text-xs">Nothing yet.</p>}
          <ul className="space-y-2">
            {items.map(n => (
              <li key={n.id} className={`text-xs p-2 rounded ${n.read ? 'text-slate' : 'text-mist bg-steelLight/50'}`}>
                {n.message}
                <div className="text-slate mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
