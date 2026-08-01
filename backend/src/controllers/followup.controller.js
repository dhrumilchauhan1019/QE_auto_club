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

// "Marking a follow-up complete should require the user to record what happened and
// establish the next step when the opportunity is still active" - enforced here.
async function complete(req, res) {
  const { resultNotes, nextDueDate, nextNotes } = req.body;
  if (!resultNotes || !resultNotes.trim()) {
    return res.status(400).json({ error: 'You must record what happened before completing a follow-up.' });
  }

  const followup = await prisma.followup.findUnique({ where: { id: req.params.id }, include: { prospect: true } });
  if (!followup) return res.status(404).json({ error: 'Follow-up not found' });

  const stillActive = !['completed', 'closed_lost', 'do_not_contact'].includes(followup.prospect.status);
  if (stillActive && !nextDueDate) {
    return res.status(400).json({ error: 'This opportunity is still active - you must set the next follow-up date before completing this one.' });
  }

  const updated = await prisma.followup.update({
    where: { id: req.params.id },
    data: { completed: true, notes: `${followup.notes || ''}${followup.notes ? ' | ' : ''}Result: ${resultNotes}` }
  });

  if (nextDueDate) {
    await prisma.followup.create({ data: { prospectId: followup.prospectId, dueDate: new Date(nextDueDate), type: followup.type, notes: nextNotes || null } });
  }
  await prisma.prospect.update({ where: { id: followup.prospectId }, data: { lastActivityAt: new Date(), nextAction: nextNotes || undefined } });

  log(req.user.id, 'followup_completed', 'prospect', followup.prospectId, resultNotes);
  res.json(updated);
}

async function create(req, res) {
  const { prospectId, dueDate, type, notes } = req.body;
  if (!prospectId || !dueDate) return res.status(400).json({ error: 'prospectId and dueDate are required' });
  const followup = await prisma.followup.create({ data: { prospectId, dueDate: new Date(dueDate), type, notes } });
  res.status(201).json(followup);
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

module.exports = { list, complete, create, widgets };
