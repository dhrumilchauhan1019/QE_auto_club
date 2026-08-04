const prisma = require('../config/database');
const { log, notify } = require('../utils/log');

const STAGES = ['lead', 'contacted', 'decision_maker_reached', 'appointment', 'presentation', 'proposal', 'contract', 'payment', 'completed'];

async function board(req, res) {
  const where = req.user.role === 'caller' ? { assignedCallerId: req.user.id } : {};
  const prospects = await prisma.prospect.findMany({
    where: { ...where, status: { in: STAGES } },
    select: { id: true, businessName: true, tier: true, score: true, status: true, vehicleCount: true, assignedCaller: { select: { name: true } } },
    orderBy: { score: 'desc' }
  });

  const columns = STAGES.reduce((acc, s) => { acc[s] = []; return acc; }, {});
  prospects.forEach(p => columns[p.status].push(p));
  res.json({ stages: STAGES, columns });
}

async function moveCard(req, res) {
  const { status } = req.body;
  if (!STAGES.includes(status) && status !== 'closed_lost' && status !== 'do_not_contact') {
    return res.status(400).json({ error: 'Invalid stage' });
  }
  const existing = await prisma.prospect.findUnique({ where: { id: req.params.id }, select: { status: true } });
  const prospect = await prisma.prospect.update({ where: { id: req.params.id }, data: { status, lastActivityAt: new Date() } });
  log(req.user.id, 'stage_changed', 'prospect', prospect.id, null, existing?.status, status);
  res.json(prospect);
}

module.exports = { board, moveCard };