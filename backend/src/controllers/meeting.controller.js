const prisma = require('../config/database');

async function create(req, res) {
  const { prospectId, scheduledAt, type, notes } = req.body;
  if (!prospectId || !scheduledAt) return res.status(400).json({ error: 'prospectId and scheduledAt are required' });

  const meeting = await prisma.meeting.create({ data: { prospectId, scheduledAt: new Date(scheduledAt), type: type || 'presentation', notes } });
  await prisma.prospect.update({ where: { id: prospectId }, data: { status: 'appointment' } });
  res.status(201).json(meeting);
}

async function list(req, res) {
  const where = req.user.role === 'caller' ? { prospect: { assignedCallerId: req.user.id } } : {};
  const meetings = await prisma.meeting.findMany({ where, orderBy: { scheduledAt: 'asc' }, include: { prospect: { select: { businessName: true } } } });
  res.json(meetings);
}

module.exports = { create, list };
