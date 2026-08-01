import { useState } from 'react';
import api from '../api/axios';
import AuthLayout from '../layouts/AuthLayout.jsx';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';

const ROLES = [
  { key: 'admin', label: 'Admin', icon: '◈', email: 'admin@qeautoclub.demo', password: 'Admin123!' },
  { key: 'executive', label: 'Executive', icon: '◆', email: 'executive@qeautoclub.demo', password: 'Executive123!' },
  { key: 'manager', label: 'Sales Manager', icon: '◐', email: 'manager@qeautoclub.demo', password: 'Manager123!' },
  { key: 'closer', label: 'Closer', icon: '◑', email: 'closer@qeautoclub.demo', password: 'Closer123!' },
  { key: 'finance', label: 'Finance', icon: '$', email: 'finance@qeautoclub.demo', password: 'Finance123!' },
  { key: 'caller', label: 'Caller', icon: '☎', email: 'caller@qeautoclub.demo', password: 'Caller123!' }
];

export default function Login() {
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function pickRole(r) {
    setRole(r.key);
    setEmail(r.email);
    setPassword(r.password);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // clear anything stale before attempting a fresh session
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // full reload, not a client-side navigate, so no old session state can leak into the next one
      window.location.assign('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Card>
        <p className="text-slate text-xs mb-3">Please select your role</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {ROLES.map(r => (
            <button
              type="button"
              key={r.key}
              onClick={() => pickRole(r)}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg border text-xs transition-colors ${
                role === r.key ? 'border-copper bg-copper/10 text-copper' : 'border-border text-slate hover:text-mist hover:border-steelLight'
              }`}
            >
              <span className="text-lg">{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>

        {/* key={role} forces React to remount these inputs on every role switch, so no
            browser-autofill leftover value from a previous role can ever survive into this one */}
        <form onSubmit={handleSubmit} className="space-y-4" key={role || 'none'}>
          <Input label="Email" type="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="Password" type="password" autoComplete="off" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !role}>{loading ? 'Signing in...' : 'Login'}</Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
