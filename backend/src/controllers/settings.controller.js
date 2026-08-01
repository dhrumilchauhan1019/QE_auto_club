const prisma = require('../config/database');

const DEFAULTS = {
  companyName: 'QE Auto Club',
  callOutcomes: 'no_answer,wrong_number,gatekeeper,unavailable,reached,unqualified,not_interested,follow_up_requested,presentation_booked,proposal_requested,closed,do_not_contact',
  pipelineStages: 'lead,contacted,decision_maker_reached,appointment,presentation,proposal,contract,payment,completed'
};

async function list(req, res) {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json({ ...DEFAULTS, ...map });
}

async function update(req, res) {
  const entries = Object.entries(req.body || {});
  for (const [key, value] of entries) {
    await prisma.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
  }
  res.json({ ok: true });
}

module.exports = { list, update };
