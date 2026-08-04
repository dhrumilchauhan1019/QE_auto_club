import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Select from '../components/common/Select.jsx';
import Input from '../components/common/Input.jsx';
import Modal from '../components/common/Modal.jsx';
import { Loader, TierBadge, StatusPill } from '../components/common/Loader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import StatusModal from '../components/common/StatusModal.jsx';

export default function ProspectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prospect, setProspect] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ scheduledAt: '', type: 'presentation' });

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusType, setStatusType] = useState("success");
  const [statusTitle, setStatusTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  function showStatus(type, title, message) {
    setStatusType(type);
    setStatusTitle(title);
    setStatusMessage(message);
    setStatusOpen(true);
  }

  async function load() {
    const { data } = await api.get(`/prospects/${id}`);
    setProspect(data);
  }
  useEffect(() => { load(); }, [id]);

  async function handleOverride(e) {
    try {

      await api.patch(`/prospects/${id}/override-tier`, {
        tier: e.target.value
      });

      showStatus(
        "success",
        "Tier Updated",
        "Prospect priority has been updated successfully."
      );

      load();

    } catch (err) {

      showStatus(
        "error",
        "Update Failed",
        err.response?.data?.error || "Unable to update tier."
      );

    }
  }

  async function getAiHelp(type) {
    setAiLoading(true);
    const { data } = await api.get(`/ai/assist/${id}`, { params: { type } });
    setAi(data);
    setAiLoading(false);
  }

  async function scheduleMeeting(e) {
    e.preventDefault();

    try {

      await api.post('/meetings', {
        prospectId: id,
        ...meetingForm
      });

      setMeetingOpen(false);

      showStatus(
        "success",
        "Meeting Scheduled",
        "Meeting has been scheduled successfully."
      );

      load();

    } catch (err) {

      showStatus(
        "error",
        "Scheduling Failed",
        err.response?.data?.error || "Unable to schedule meeting."
      );

    }
  }

  if (!prospect) return <Loader label="Loading prospect..." />;
  const effectiveTier = prospect.overrideTier || prospect.tier;
  const canEdit = user.role !== 'caller';
  const canArchive = ['admin', 'manager', 'closer'].includes(user.role);

  async function archiveProspect() {

    if (!confirm("Archive this prospect?")) return;

    try {

      await api.patch(`/prospects/${id}/archive`);

      showStatus(
        "success",
        "Prospect Archived",
        "The prospect has been archived successfully."
      );

      setTimeout(() => {
        navigate("/prospects");
      }, 1200);

    } catch (err) {

      showStatus(
        "error",
        "Archive Failed",
        err.response?.data?.error || "Unable to archive prospect."
      );

    }
  }

  return (
    <>
      <div className="space-y-6">
        <button onClick={() => navigate('/prospects')} className="text-slate text-sm hover:text-mist">&larr; Back to prospects</button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-mist">{prospect.businessName}</h1>
            <div className="flex items-center gap-2 mt-2">
              <TierBadge tier={effectiveTier} />
              <StatusPill status={prospect.status} />
              <span className="text-slate text-xs font-mono-data">Score {prospect.score}/100</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canArchive && <Button variant="danger" onClick={archiveProspect}>Archive</Button>}
            <Button variant="secondary" onClick={() => setMeetingOpen(true)}>Schedule Meeting</Button>
            <Button onClick={() => navigate(`/proposal-builder?prospectId=${prospect.id}`)}>Build Proposal</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Contact" className="col-span-1">
            <dl className="text-sm space-y-2">
              <Row label="Decision maker" value={prospect.decisionMaker} />
              <Row label="Position" value={prospect.decisionMakerPosition} />
              <Row label="Phone" value={prospect.phone} />
              <Row label="Email" value={prospect.email} />
              <Row label="Industry" value={prospect.industry} />
              <Row label="Vehicles" value={prospect.vehicleCount} />
              <Row label="Location" value={[prospect.location, prospect.city, prospect.state].filter(Boolean).join(', ')} />
              <Row label="Current arrangement" value={prospect.currentArrangement} />
              <LinkRow label="Website" value={prospect.website} />
              <Row label="Lead source" value={prospect.leadSource} />
              <LongRow label="Qualification evidence" value={prospect.qualificationEvidence} />
              <LongRow label="Verification status" value={prospect.verificationStatus} />
            </dl>
          </Card>

          <Card title="Priority score" className="col-span-1">
            <p className="text-sm text-slate leading-relaxed">{prospect.scoreReason}</p>
            {canEdit && (
              <div className="mt-4">
                <Select label="Manual tier override" value={prospect.overrideTier || ''} onChange={handleOverride}
                  options={[{ value: '', label: 'No override' }, { value: 'A', label: 'Tier A' }, { value: 'B', label: 'Tier B' }, { value: 'C', label: 'Tier C' }]} />
                <p className="text-xs text-slate mt-2">Original calculated tier: {prospect.tier}</p>
              </div>
            )}
          </Card>

          <Card title="AI Assistant" className="col-span-1">
            <div className="flex flex-wrap gap-1 mb-3">
              {[['call_summary', 'Call Summary'], ['next_action', 'Next Action'], ['followup_suggestion', 'Follow-up']].map(([t, l]) => (
                <button key={t} onClick={() => getAiHelp(t)} className="text-xs px-2 py-1 rounded bg-steelLight text-slate hover:text-copper">{l}</button>
              ))}
            </div>
            {aiLoading && <Loader label="Thinking..." />}
            {ai && !aiLoading && (
              <div className="space-y-2">
                <p className="text-sm text-mist">{ai.text}</p>
                <p className="text-xs text-copper">{ai.disclosure}</p>
              </div>
            )}
          </Card>
        </div>

        <Card title="Activity history">
          {prospect.activities.length === 0 ? <p className="text-slate text-sm">No calls logged yet.</p> : (
            <ul className="space-y-3">
              {prospect.activities.map(a => (
                <li key={a.id} className="text-sm border-l-2 border-border pl-3">
                  <span className="text-copper capitalize">{a.outcome.replace(/_/g, ' ')}</span>
                  <span className="text-slate ml-2">{new Date(a.createdAt).toLocaleString()}</span>
                  {a.caller && <span className="text-slate ml-2">· {a.caller.name}</span>}
                  {a.notes && <p className="text-mist mt-1">{a.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Open follow-ups">
            {prospect.followups.filter(f => !f.completed).length === 0 ? <p className="text-slate text-sm">None open.</p> : (
              <ul className="space-y-2 text-sm">
                {prospect.followups.filter(f => !f.completed).map(f => (
                  <li key={f.id} className="flex justify-between"><span className="text-mist">{f.type} — {f.notes}</span><span className="text-slate font-mono-data">{new Date(f.dueDate).toLocaleDateString()}</span></li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Meetings">
            {prospect.meetings.length === 0 ? <p className="text-slate text-sm">None scheduled.</p> : (
              <ul className="space-y-2 text-sm">
                {prospect.meetings.map(m => (
                  <li key={m.id} className="flex justify-between"><span className="text-mist capitalize">{m.type}</span><span className="text-slate font-mono-data">{new Date(m.scheduledAt).toLocaleString()}</span></li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Modal open={meetingOpen} onClose={() => setMeetingOpen(false)} title="Schedule Meeting">
          <form onSubmit={scheduleMeeting} className="space-y-3">
            <Input label="Date & time" type="datetime-local" required value={meetingForm.scheduledAt} onChange={e => setMeetingForm({ ...meetingForm, scheduledAt: e.target.value })} />
            <Select label="Type" value={meetingForm.type} onChange={e => setMeetingForm({ ...meetingForm, type: e.target.value })}
              options={[{ value: 'presentation', label: 'Presentation' }, { value: 'site_visit', label: 'Site Visit' }, { value: 'signing', label: 'Contract Signing' }]} />
            <Button type="submit" className="w-full">Schedule</Button>
          </form>
        </Modal>
      </div>

      <StatusModal
        open={statusOpen}
        type={statusType}
        title={statusTitle}
        message={statusMessage}
        buttonText="OK"
        onClose={() => setStatusOpen(false)}
      />
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate shrink-0">{label}</dt>
      <dd className="text-mist text-right break-words min-w-0">{value || '—'}</dd>
    </div>
  );
}

function LinkRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate shrink-0">{label}</dt>
      <dd className="text-mist text-right break-all min-w-0">
        {value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-copper hover:underline">
            {value}
          </a>
        ) : '—'}
      </dd>
    </div>
  );
}

function LongRow({ label, value }) {
  if (!value) {
    return (
      <div className="flex justify-between gap-3">
        <dt className="text-slate shrink-0">{label}</dt>
        <dd className="text-mist">—</dd>
      </div>
    );
  }
  return (
    <div>
      <dt className="text-slate mb-1">{label}</dt>
      <dd className="text-mist break-words leading-relaxed">{value}</dd>
    </div>
  );
}