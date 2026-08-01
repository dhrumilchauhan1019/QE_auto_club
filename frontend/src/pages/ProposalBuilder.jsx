import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/common/Card.jsx';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import { Loader } from '../components/common/Loader.jsx';

export default function ProposalBuilder() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const prospectId = params.get('prospectId');
  const [prospect, setProspect] = useState(null);
  const [form, setForm] = useState({
    fleetSize: '', serviceNeeds: '', currentSpend: '', downtimeConcerns: '',
    recommendedProgram: 'Stewardship Standard', price: 25000, options: '', startDate: '', paymentArrangement: ''
  });
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (prospectId) api.get(`/prospects/${prospectId}`).then(res => {
      setProspect(res.data);
      setForm(f => ({ ...f, fleetSize: res.data.vehicleCount }));
    });
  }, [prospectId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await api.post('/proposals', { ...form, prospectId });
    const { data: sum } = await api.get(`/proposals/${data.id}/summary`);
    setSummary(sum);
  }

  async function markAccepted() {
    await api.patch(`/proposals/${summary.proposal.id}/status`, { status: 'accepted' });
    navigate(`/prospects/${prospectId}`);
  }

  if (!prospectId) return <Card><p className="text-slate text-sm">Open a prospect first, then click "Build Proposal".</p></Card>;
  if (!prospect) return <Loader label="Loading prospect..." />;

  if (summary) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="font-display text-2xl text-mist">Proposal Summary</h1>
        <Card className="print:bg-white">
          <h2 className="font-display text-lg text-mist mb-1">{prospect.businessName}</h2>
          <p className="text-slate text-sm mb-4">Stewardship Program Proposal</p>
          <Section title="Identified problems">
            <ul className="list-disc list-inside text-sm text-mist space-y-1">
              {summary.identifiedProblems.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </Section>
          <Section title="Recommended solution"><p className="text-sm text-mist">{summary.recommendedSolution}</p></Section>
          <Section title="Scope"><p className="text-sm text-mist">{summary.scope}</p></Section>
          <Section title="Price"><p className="text-sm text-copper font-mono-data text-lg">${summary.price.toLocaleString()}</p></Section>
          <Section title="Next step"><p className="text-sm text-mist">{summary.nextStep}</p></Section>
          <Section title="Acceptance"><p className="text-sm text-mist">{summary.acceptanceArea}</p></Section>
        </Card>
        <div className="flex gap-2">
          <Button onClick={() => window.print()}>Print</Button>
          <Button variant="secondary" onClick={markAccepted}>Mark Accepted (creates contract)</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-2xl text-mist">Build Proposal — {prospect.businessName}</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Fleet size" type="number" value={form.fleetSize} onChange={e => setForm({ ...form, fleetSize: e.target.value })} />
          <Input label="Service needs" value={form.serviceNeeds} onChange={e => setForm({ ...form, serviceNeeds: e.target.value })} />
          <Input label="Estimated current spend ($/yr)" type="number" value={form.currentSpend} onChange={e => setForm({ ...form, currentSpend: e.target.value })} />
          <Input label="Downtime concerns" value={form.downtimeConcerns} onChange={e => setForm({ ...form, downtimeConcerns: e.target.value })} />
          <Input label="Recommended program" value={form.recommendedProgram} onChange={e => setForm({ ...form, recommendedProgram: e.target.value })} />
          <Input label="Price" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          <Input label="Options" value={form.options} onChange={e => setForm({ ...form, options: e.target.value })} />
          <Input label="Start date" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          <Input label="Payment arrangement" value={form.paymentArrangement} onChange={e => setForm({ ...form, paymentArrangement: e.target.value })} />
          <Button type="submit" className="w-full">Generate Proposal</Button>
        </form>
      </Card>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <p className="text-copper text-xs uppercase tracking-wide mb-1">{title}</p>
      {children}
    </div>
  );
}
