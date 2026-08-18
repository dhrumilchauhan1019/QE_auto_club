import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import NotificationBell from '../components/common/NotificationBell.jsx';

const ALL = ['admin', 'executive', 'manager', 'closer', 'finance', 'caller'];
const NAV = [
  { to: '/', label: 'Dashboard', icon: '◧', roles: ALL },
  { to: '/prospects', label: 'Prospects', icon: '☰', roles: ALL },
  { to: '/csv-import', label: 'Import CSV', icon: '⇩', roles: ['admin', 'manager', 'caller'] },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV.filter(n => n.roles.includes(user?.role));

  const sidebar = (
    <>
      <div className="px-5 py-6 flex items-center gap-2">
        <div className="w-1.5 h-6 copper-rail rounded-full" />
        <span className="font-display text-mist text-sm">QE Auto Club</span>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMenuOpen(false)}
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
    </>
  );

  return (
    <div className="min-h-screen bg-ink flex">
      {/* desktop sidebar - always visible from md up, normal flow */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border flex-col">{sidebar}</aside>

      {/* mobile sidebar - off-canvas drawer, only rendered/interactive when open */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <aside className="relative w-64 max-w-[80vw] bg-ink border-r border-border flex flex-col h-full">{sidebar}</aside>
        </div>
      )}

      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* mobile top bar - hamburger + brand, hidden on desktop where the sidebar is always visible */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-ink z-30">
          <button onClick={() => setMenuOpen(true)} className="text-mist text-xl leading-none px-1" aria-label="Open menu">☰</button>
          <span className="font-display text-mist text-sm">QE Auto Club</span>
          <NotificationBell />
        </div>

        <div className="hidden md:flex justify-end px-4 sm:px-6 lg:px-8 pt-4"><NotificationBell /></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:pb-8">{children}</div>
      </main>
    </div>
  );
}