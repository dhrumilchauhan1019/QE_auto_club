const prisma = require('../config/database');

function range(period, dateParam) {
  const base = dateParam ? new Date(dateParam) : new Date();
  const start = new Date(base); const end = new Date(base);
  if (period === 'weekly') { start.setDate(start.getDate() - start.getDay()); start.setHours(0,0,0,0); end.setTime(start.getTime()); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999); }
  else if (period === 'monthly') { start.setDate(1); start.setHours(0,0,0,0); end.setMonth(end.getMonth() + 1, 0); end.setHours(23,59,59,999); }
  else { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
  return { start, end };
}

async function daily(req, res) {
  const period = req.query.period || 'daily';
  const { start, end } = range(period, req.query.date);
  const scope = req.user.role === 'caller' ? { callerId: req.user.id } : {};
  const prospectScope = req.user.role === 'caller' ? { assignedCallerId: req.user.id } : {};

  const activities = await prisma.activity.findMany({
    where: { ...scope, createdAt: { gte: start, lte: end } },
    include: { caller: { select: { name: true } }, prospect: { select: { industry: true, tier: true } } }
  });

  const [followupsCompleted, followupsDue, proposalsSent, contractsSigned, revenueContracted, revenueCollected, stuck] = await Promise.all([
    prisma.followup.count({ where: { completed: true, dueDate: { gte: start, lte: end }, prospect: prospectScope } }),
    prisma.followup.count({ where: { dueDate: { gte: start, lte: end }, prospect: prospectScope } }),
    prisma.proposal.count({ where: { createdAt: { gte: start, lte: end }, prospect: prospectScope } }),
    prisma.contract.count({ where: { signedAt: { gte: start, lte: end }, prospect: prospectScope } }),
    prisma.contract.aggregate({ _sum: { amount: true }, where: { signedAt: { gte: start, lte: end }, prospect: prospectScope } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { collectedAt: { gte: start, lte: end }, prospect: prospectScope } }),
    prisma.prospect.findMany({ where: { ...prospectScope, status: { notIn: ['completed', 'closed_lost', 'do_not_contact'] }, nextAction: null }, select: { id: true, businessName: true, status: true } })
  ]);

  const byCaller = groupCount(activities, a => a.caller ? a.caller.name : 'Unassigned');
  const byIndustry = groupCount(activities, a => a.prospect.industry || 'Unknown');
  const byTier = groupCount(activities, a => a.prospect.tier);

  res.json({
    period, date: start.toISOString().slice(0, 10),
    calls: activities.length,
    decisionMakersReached: activities.filter(a => a.decisionMakerReached).length,
    followupsDue, followupsCompleted, proposalsSent, contractsSigned,
    revenueContracted: revenueContracted._sum.amount || 0,
    revenueCollected: revenueCollected._sum.amount || 0,
    conversionByCaller: byCaller, conversionByIndustry: byIndustry, conversionByTier: byTier,
    whatIsStuck: stuck,
    summary: {
      whatHappened: `${activities.length} calls logged, ${contractsSigned} contracts signed.`,
      whatIsStuck: `${stuck.length} active prospects have no assigned next action.`,
      whoIsPerforming: Object.entries(byCaller).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No activity yet',
      whatMustHappenTomorrow: `${Math.max(0, followupsDue - followupsCompleted)} follow-ups still open.`
    }
  });
}

function groupCount(items, keyFn) {
  return items.reduce((acc, item) => { const k = keyFn(item); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
}

module.exports = { daily };
