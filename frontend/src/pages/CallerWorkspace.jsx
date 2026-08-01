import { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Select from '../components/common/Select.jsx';
import Input from '../components/common/Input.jsx';
import { Loader, TierBadge } from '../components/common/Loader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const OUTCOMES = [
  ['no_answer', 'No answer'], ['voicemail_left', 'Voicemail left'], ['gatekeeper_reached', 'Gatekeeper reached'],
  ['decision_maker_unavailable', 'Decision-maker unavailable'], ['decision_maker_identified', 'Decision-maker identified'],
  ['decision_maker_reached', 'Decision-maker reached'], ['wrong_number', 'Wrong number'], ['email_requested', 'Email requested'],
  ['call_back_later', 'Call back later'], ['not_interested', 'Not interested'], ['existing_provider', 'Existing provider'],
  ['internal_automotive_department', 'Internal automotive department'], ['insufficient_fleet', 'Insufficient fleet'],
  ['qualified', 'Qualified'], ['presentation_scheduled', 'Presentation scheduled'], ['disqualified', 'Disqualified'],
  ['duplicate', 'Duplicate'], ['do_not_contact', 'Do not contact']
];

// keep in sync with backend caller.controller.js - drives the inline "required" hints
const CLOSING_OUTCOMES = ['not_interested', 'existing_provider', 'internal_automotive_department', 'insufficient_fleet', 'disqualified', 'duplicate', 'do_not_contact'];
const REQUIRES_DATE = ['no_answer', 'call_back_later', 'decision_maker_unavailable', 'presentation_scheduled'];
const REQUIRES_NOTES = ['not_interested', 'disqualified', 'duplicate', 'insufficient_fleet', 'internal_automotive_department'];

export default function CallerWorkspace() {
  const { user } = useAuth();
  const [current, setCurrent] = useState(null);
  const [script, setScript] = useState('');
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState('decision_maker_reached');
  const [dmReached, setDmReached] = useState(false);
  const [notes, setNotes] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionNote, setNextActionNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const callerParam = { callerId: user.role === 'caller' ? user.id : undefined };
  const needsDate = REQUIRES_DATE.includes(outcome);
  const needsNotes = REQUIRES_NOTES.includes(outcome);
  const isClosing = CLOSING_OUTCOMES.includes(outcome);

  async function loadQueue() {
    const { data } = await api.get('/caller/queue', { params: callerParam });
    setQueue(data);
  }

  async function loadNext(prospectId) {
    setLoading(true);
    setMessage(''); setError('');
    const { data } = await api.get('/caller/next', { params: { ...callerParam, prospectId } });
    setCurrent(data.prospect);
    setScript(data.openingScript || '');
    setLoading(false);
  }

  useEffect(() => { loadNext(); loadQueue(); }, []);

  async function submitCall(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/caller/log', {
        prospectId: current.id, callerId: user.id, outcome,
        decisionMakerReached: dmReached, notes, nextActionDate: nextActionDate || undefined, nextActionNote
      });
      setNotes(''); setNextActionDate(''); setNextActionNote(''); setDmReached(false); setOutcome('decision_maker_reached');
      setMessage('Call logged.');
      loadNext();
      loadQueue();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not log this call.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-mist">Call Queue</h1>
        <p className="text-slate text-sm mt-1">{queue.length} prospect{queue.length === 1 ? '' : 's'} in your queue — pick anyone, or work top to bottom</p>
      </div>

      <div className="flex gap-6 items-start">
        <Card title="Queue" className="w-72 shrink-0 max-h-[70vh] overflow-y-auto">
          {queue.length === 0 ? <p className="text-slate text-sm">Queue is empty.</p> : (
            <ul className="space-y-1">
              {queue.map(p => (
                <li
                  key={p.id}
                  onClick={() => loadNext(p.id)}
                  className={`px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${current?.id === p.id ? 'bg-copper/10 text-copper' : 'text-mist hover:bg-steelLight/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{p.businessName}</span>
                    <span className="text-xs font-mono-data text-slate">{p.score}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <TierBadge tier={p.overrideTier || p.tier} />
                    <span className="text-slate text-xs capitalize">{p.status.replace(/_/g, ' ')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex-1 min-w-0">
          {loading ? <Loader label="Loading prospect..." /> : !current ? (
            <Card><p className="text-slate text-sm">{message || 'No prospects currently in the queue. Nice work.'}</p></Card>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <Card title="Account context">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-display text-lg text-mist">{current.businessName}</h2>
                  <TierBadge tier={current.overrideTier || current.tier} />
                </div>
                <dl className="text-sm space-y-1 text-mist">
                  <p><span className="text-slate">Decision maker:</span> {current.decisionMaker || '—'}</p>
                  <p><span className="text-slate">Phone:</span> {current.phone || '—'}</p>
                  <p><span className="text-slate">Industry:</span> {current.industry || '—'} · {current.vehicleCount} vehicles</p>
                  <p><span className="text-slate">Current arrangement:</span> {current.currentArrangement || '—'}</p>
                </dl>
                <div className="mt-4 bg-ink rounded-lg p-4">
                  <p className="text-copper text-xs uppercase tracking-wide mb-1">Approved opening</p>
                  <p className="text-mist text-sm italic">{script}</p>
                </div>
              </Card>

              <Card title="Log outcome">
                <form onSubmit={submitCall} className="space-y-3">
                  <Select label="Outcome" value={outcome} onChange={e => setOutcome(e.target.value)} options={OUTCOMES.map(([v, l]) => ({ value: v, label: l }))} />
                  <label className="flex items-center gap-2 text-sm text-mist">
                    <input type="checkbox" checked={dmReached} onChange={e => setDmReached(e.target.checked)} />
                    Decision-maker was reached
                  </label>
                  <Input label={needsNotes ? 'Notes — reason required for this outcome' : 'Notes'} value={notes} onChange={e => setNotes(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label={needsDate ? 'Next action date — required' : 'Next action date'} type="date" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} />
                    <Input label="Next action note" value={nextActionNote} onChange={e => setNextActionNote(e.target.value)} />
                  </div>
                  {!isClosing && <p className="text-xs text-slate">This outcome keeps the prospect active — a next action date or note is required before you can submit.</p>}
                  <Button type="submit" className="w-full">Log Call & Get Next</Button>
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                  {message && !error && <p className="text-copper text-xs">{message}</p>}
                </form>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
