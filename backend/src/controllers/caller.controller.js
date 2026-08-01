const prisma = require('../config/database');
const { log, notify } = require('../utils/log');

// full disposition list per the client's controlled-outcomes memo
const VALID_OUTCOMES = [
  'no_answer', 'voicemail_left', 'gatekeeper_reached', 'decision_maker_unavailable',
  'decision_maker_identified', 'decision_maker_reached', 'wrong_number', 'email_requested',
  'call_back_later', 'not_interested', 'existing_provider', 'internal_automotive_department',
  'insufficient_fleet', 'qualified', 'presentation_scheduled', 'disqualified', 'duplicate', 'do_not_contact'
];

// these dispositions close the opportunity - no next action is required to leave the record
const CLOSING_OUTCOMES = ['not_interested', 'existing_provider', 'internal_automotive_department', 'insufficient_fleet', 'disqualified', 'duplicate', 'do_not_contact'];

// these require a specific date/time before the call can be logged at all
const REQUIRES_DATE = ['no_answer', 'call_back_later', 'decision_maker_unavailable', 'presentation_scheduled'];

// these require a reason in the notes field - "not interested" or "disqualified" with no explanation isn't acceptable
const REQUIRES_NOTES = ['not_interested', 'disqualified', 'duplicate', 'insufficient_fleet', 'internal_automotive_department'];

const OPENING_SCRIPTS = {
  A: "Hi [Decision Maker], this is [Caller] with QE Auto Club. We work with fleets like yours to cut vehicle downtime and control maintenance costs - do you have two minutes?",
  B: "Hi [Decision Maker], this is [Caller] with QE Auto Club. We help local businesses with fleet vehicles reduce unexpected repair costs. Is now an okay time to talk?",
  C: "Hi [Decision Maker], this is [Caller] with QE Auto Club, quick call about keeping your business vehicles on the road with less downtime."
};

async function next(req, res) {
  const callerId = req.user.role === 'caller' ? req.user.id : req.query.callerId;
  const where = { archived: false, status: { notIn: ['completed', 'closed_lost', 'do_not_contact'] }, ...(callerId ? { assignedCallerId: callerId } : {}) };
  if (req.query.prospectId) where.id = req.query.prospectId;

  const prospect = await prisma.prospect.findFirst({
    where,
    orderBy: [{ score: 'desc' }, { lastActivityAt: 'asc' }],
    include: { activities: { orderBy: { createdAt: 'desc' }, take: 5 } }
  });

  if (!prospect) return res.json({ prospect: null, message: 'No prospects in queue' });

  const effectiveTier = prospect.overrideTier || prospect.tier;
  res.json({ prospect, openingScript: OPENING_SCRIPTS[effectiveTier] || OPENING_SCRIPTS.C });
}

async function queue(req, res) {
  const callerId = req.user.role === 'caller' ? req.user.id : req.query.callerId;
  const where = { archived: false, status: { notIn: ['completed', 'closed_lost', 'do_not_contact'] }, ...(callerId ? { assignedCallerId: callerId } : {}) };

  const prospects = await prisma.prospect.findMany({
    where,
    orderBy: [{ score: 'desc' }, { lastActivityAt: 'asc' }],
    take: 50,
    select: { id: true, businessName: true, tier: true, overrideTier: true, score: true, status: true, vehicleCount: true, lastActivityAt: true }
  });
  res.json(prospects);
}

async function logCall(req, res) {
  const { prospectId, outcome, decisionMakerReached, notes, nextActionDate, nextActionNote } = req.body;
  const callerId = req.user.role === 'caller' ? req.user.id : (req.body.callerId || null);

  if (!prospectId || !outcome) return res.status(400).json({ error: 'prospectId and outcome are required' });
  if (!VALID_OUTCOMES.includes(outcome)) return res.status(400).json({ error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')}` });

  // "No active prospect should exist without a next action" - enforced here, not just suggested
  const isClosing = CLOSING_OUTCOMES.includes(outcome);
  if (!isClosing && !nextActionDate && !nextActionNote) {
    return res.status(400).json({ error: 'This outcome keeps the prospect active. You must set a next action date or note before logging it.' });
  }
  if (REQUIRES_DATE.includes(outcome) && !nextActionDate) {
    return res.status(400).json({ error: `"${outcome.replace(/_/g, ' ')}" requires a next call date.` });
  }
  if (REQUIRES_NOTES.includes(outcome) && !notes) {
    return res.status(400).json({ error: `"${outcome.replace(/_/g, ' ')}" requires a reason in the notes field.` });
  }

  const activity = await prisma.activity.create({
    data: { prospectId, callerId, outcome, decisionMakerReached: !!decisionMakerReached, notes }
  });

  const stageMap = {
    gatekeeper_reached: 'contacted',
    decision_maker_unavailable: 'contacted',
    decision_maker_identified: 'contacted',
    decision_maker_reached: decisionMakerReached === false ? 'contacted' : 'decision_maker_reached',
    presentation_scheduled: 'appointment',
    not_interested: 'closed_lost',
    existing_provider: 'closed_lost',
    internal_automotive_department: 'closed_lost',
    insufficient_fleet: 'closed_lost',
    disqualified: 'closed_lost',
    duplicate: 'closed_lost',
    do_not_contact: 'do_not_contact'
  };

  const updateData = {
    lastActivityAt: new Date(),
    status: stageMap[outcome] || undefined,
    nextAction: nextActionNote || undefined,
    followUpDate: nextActionDate ? new Date(nextActionDate) : undefined
  };
  // "duplicate" is a record-quality flag, not a sale outcome - archive it rather than leave it in the pipeline
  if (outcome === 'duplicate') updateData.archived = true;

  await prisma.prospect.update({ where: { id: prospectId }, data: updateData });

  if (nextActionDate) {
    const followupType = outcome === 'email_requested' ? 'email' : outcome === 'presentation_scheduled' ? 'presentation' : 'call';
    await prisma.followup.create({ data: { prospectId, dueDate: new Date(nextActionDate), notes: nextActionNote, type: followupType } });
  }
  // "voicemail left creates a follow-up" and "email requested creates an email task" even with no date typed in
  else if (outcome === 'voicemail_left' || outcome === 'email_requested') {
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 1);
    await prisma.followup.create({ data: { prospectId, dueDate, type: outcome === 'email_requested' ? 'email' : 'call', notes: nextActionNote || `Auto-created from ${outcome.replace(/_/g, ' ')}` } });
  }

  if (outcome === 'presentation_scheduled' && nextActionDate) {
    await prisma.meeting.create({ data: { prospectId, scheduledAt: new Date(nextActionDate), type: 'presentation', notes: nextActionNote } });
  }

  log(callerId, 'call_logged', 'prospect', prospectId, outcome);
  res.status(201).json(activity);
}

module.exports = { next, queue, logCall, VALID_OUTCOMES, CLOSING_OUTCOMES, REQUIRES_DATE, REQUIRES_NOTES };
