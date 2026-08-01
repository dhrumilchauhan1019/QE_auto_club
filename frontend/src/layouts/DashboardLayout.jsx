import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import NotificationBell from '../components/common/NotificationBell.jsx';

const ALL = ['admin', 'executive', 'manager', 'closer', 'finance', 'caller'];
const NAV = [
  { to: '/', label: 'Dashboard', icon: '◧', roles: ALL },
  { to: '/prospects', label: 'Prospects', icon: '☰', roles: ALL },
  { to: '/csv-import', label: 'Import CSV', icon: '⇩', roles: ['admin', 'manager'] },
  { to: '/caller', label: 'Call Queue', icon: '☎', roles: ['admin', 'manager', 'caller'] },
  { to: '/followups', label: 'Follow-ups', icon: '⏱', roles: ['admin', 'manager', 'caller', 'closer'] },
  { to: '/pipeline', label: 'Pipeline', icon: '⚏', roles: ALL },
  { to: '/contracts', label: 'Contracts', icon: '▤', roles: ['admin', 'executive', 'manager', 'closer', 'finance'] },
  { to: '/payments', label: 'Payments', icon: '$', roles: ['admin', 'executive', 'manager', 'finance'] },
  { to: '/reports', label: 'Reports', icon: '▦', roles: ALL },
  { to: '/users', label: 'Users', icon: '◐', roles: ['admin'] },
  { to: '/activity-logs', label: 'Activity Logs', icon: '⋯', roles: ALL },
  { to: '/settings', label: 'Settings', icon: '⚙', roles: ['admin'] }
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const items = NAV.filter(n => n.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-ink flex">
      <aside className="w-60 shrink-0 border-r border-border flex flex-col">
        <div className="px-5 py-6 flex items-center gap-2">
          <div className="w-1.5 h-6 copper-rail rounded-full" />
          <span className="font-display text-mist text-sm">QE Auto Club</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-copper/10 text-copper' : 'text-slate hover:text-mist hover:bg-steelLight/50'
                }`
              }
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-border">
          <div className="text-xs text-slate mb-2 capitalize">{user?.name} · {user?.role}</div>
          <button onClick={() => { logout(); window.location.assign('/login'); }} className="text-xs text-slate hover:text-copper">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="flex justify-end px-8 pt-4"><NotificationBell /></div>
        <div className="max-w-7xl mx-auto px-8 pb-8">{children}</div>
      </main>
    </div>
  );
}
