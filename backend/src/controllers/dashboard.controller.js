const prisma = require('../config/database');

const TARGET_PROSPECTS = 1000;
const TARGET_SALES = 240;
const MIN_CONTRACT_VALUE = 25000;

async function overview(req, res) {
  const scope = req.user.role === 'caller' ? { assignedCallerId: req.user.id } : {};
  const activityScope = req.user.role === 'caller' ? { callerId: req.user.id } : {};

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const [total, tierA, tierB, tierC, callsToday, dmReached, appointments, presentations, proposalsSent, contractsSigned, contracts, payments, callerCount] = await Promise.all([
    prisma.prospect.count({ where: scope }),
    prisma.prospect.count({ where: { ...scope, tier: 'A' } }),
    prisma.prospect.count({ where: { ...scope, tier: 'B' } }),
    prisma.prospect.count({ where: { ...scope, tier: 'C' } }),
    prisma.activity.count({ where: { ...activityScope, createdAt: { gte: todayStart } } }),
    prisma.activity.count({ where: { ...activityScope, decisionMakerReached: true } }),
    prisma.prospect.count({ where: { ...scope, status: 'appointment' } }),
    prisma.prospect.count({ where: { ...scope, status: 'presentation' } }),
    prisma.proposal.count({ where: { status: 'sent', prospect: scope } }),
    prisma.contract.count({ where: { status: 'signed', prospect: scope } }),
    prisma.contract.findMany({ where: { prospect: scope } }),
    prisma.payment.findMany({ where: { prospect: scope } }),
    req.user.role !== 'caller' ? prisma.user.count({ where: { role: 'caller' } }) : Promise.resolve(null)
  ]);

  const totalContracted = contracts.reduce((s, c) => s + c.amount, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);

  res.json({
    campaign: { targetProspects: TARGET_PROSPECTS, targetSales: TARGET_SALES, minContractValue: MIN_CONTRACT_VALUE },
    prospects: { total, tierA, tierB, tierC },
    callers: callerCount,
    activity: { callsToday, decisionMakersReached: dmReached },
    funnel: { appointments, presentations, proposalsSent, contractsSigned },
    revenue: { totalContracted, totalCollected, salesProgress: contractsSigned, salesTarget: TARGET_SALES, salesPct: Math.round((contractsSigned / TARGET_SALES) * 100) }
  });
}

async function callsByDay(req, res) {
  const scope = req.user.role === 'caller' ? { callerId: req.user.id } : {};
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activities = await prisma.activity.findMany({ where: { ...scope, createdAt: { gte: since } }, select: { createdAt: true } });

  const byDay = {};
  activities.forEach(a => {
    const key = a.createdAt.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + 1;
  });
  res.json(byDay);
}

module.exports = { overview, callsByDay };
