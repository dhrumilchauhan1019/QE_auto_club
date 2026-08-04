const prisma = require('../config/database');
const { log } = require('../utils/log');

function scope(req, where = {}) {
  if (req.user.role === 'caller') where.prospect = { assignedCallerId: req.user.id };
  return where;
}

async function list(req, res) {
  const { scope: timeScope } = req.query;
  const now = new Date();
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

  const where = scope(req, { completed: false });
  if (timeScope === 'overdue') where.dueDate = { lt: now };
  else if (timeScope === 'due_today') where.dueDate = { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: endOfToday };
  else if (timeScope === 'upcoming') where.dueDate = { gt: endOfToday };

  const followups = await prisma.followup.findMany({
    where, orderBy: { dueDate: 'asc' },
    include: { prospect: { select: { id: true, businessName: true, tier: true, status: true, assignedCallerId: true } } }
  });
  res.json(followups);
}

// Mark Done is now a single lightweight action - no mandatory result notes, no forced
// next-action date. That friction moved to the separate "Follow-up" button/modal instead,
// which lets the user explicitly add a new follow-up or edit this one.
async function complete(req, res) {
  const followup = await prisma.followup.findUnique({ where: { id: req.params.id } });
  if (!followup) return res.status(404).json({ error: 'Follow-up not found' });

  const updated = await prisma.followup.update({ where: { id: req.params.id }, data: { completed: true } });
  await prisma.prospect.update({ where: { id: followup.prospectId }, data: { lastActivityAt: new Date() } });

  log(req.user.id, 'followup_completed', 'prospect', followup.prospectId, followup.notes || null);
  res.json(updated);
}

// "Add New Follow-up" - a separate additional record, independent of any existing one
async function create(req, res) {
  const { prospectId, dueDate, type, notes } = req.body;
  if (!prospectId || !dueDate) return res.status(400).json({ error: 'prospectId and dueDate are required' });
  const followup = await prisma.followup.create({ data: { prospectId, dueDate: new Date(dueDate), type, notes } });
  await prisma.prospect.update({ where: { id: prospectId }, data: { lastActivityAt: new Date(), nextAction: notes || undefined } });
  res.status(201).json(followup);
}

// "Change Existing Follow-up" - edits this row's own date/type/notes in place
async function update(req, res) {
  const { dueDate, type, notes } = req.body;
  const existing = await prisma.followup.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Follow-up not found' });

  const data = {};
  if (dueDate) data.dueDate = new Date(dueDate);
  if (type !== undefined) data.type = type;
  if (notes !== undefined) data.notes = notes;

  const updated = await prisma.followup.update({ where: { id: req.params.id }, data });

  const prevDate = existing.dueDate.toISOString().slice(0, 10);
  const newDate = updated.dueDate.toISOString().slice(0, 10);
  log(req.user.id, 'followup_changed', 'prospect', existing.prospectId, null, prevDate, newDate);

  res.json(updated);
}

async function widgets(req, res) {
  const prospectScope = req.user.role === 'caller' ? { assignedCallerId: req.user.id } : {};
  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [dueToday, overdue, upcomingMeetings, pendingProposals, pendingContracts, pendingPayments] = await Promise.all([
    prisma.followup.count({ where: scope(req, { completed: false, dueDate: { gte: new Date(now.setHours(0,0,0,0)), lte: new Date(now.setHours(23,59,59,999)) } }) }),
    prisma.followup.count({ where: scope(req, { completed: false, dueDate: { lt: new Date() } }) }),
    prisma.meeting.count({ where: { status: 'scheduled', scheduledAt: { gte: new Date() }, prospect: prospectScope } }),
    prisma.proposal.count({ where: { status: 'sent', prospect: prospectScope } }),
    prisma.contract.count({ where: { status: 'awaiting_signature', prospect: prospectScope } }),
    prisma.contract.count({ where: { status: 'signed', prospect: prospectScope } })
  ]);

  res.json({ dueToday, overdue, upcomingMeetings, pendingProposals, pendingContracts, pendingPayments });
}

module.exports = { list, complete, create, update, widgets };