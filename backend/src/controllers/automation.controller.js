const prisma = require('../config/database');
const { notify, notifyRoles } = require('../utils/log');

// the actual work, callable both from the HTTP route (manual trigger) and the
// background interval in server.js (automatic, no button needed)
async function runAutomation() {
  const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const stale = await prisma.prospect.findMany({
    where: { archived: false, status: { notIn: ['completed', 'closed_lost', 'do_not_contact'] }, OR: [{ lastActivityAt: { lt: staleCutoff } }, { lastActivityAt: null }] }
  });

  let flagged = 0;
  for (const p of stale) {
    if (!p.nextAction) {
      await prisma.prospect.update({ where: { id: p.id }, data: { nextAction: 'NEEDS ATTENTION: no activity in 7+ days' } });
      if (p.assignedCallerId) await notify(p.assignedCallerId, 'inactive_prospect', `${p.businessName} has had no activity in 7+ days`, p.id);
      if (p.supervisingManagerId) await notify(p.supervisingManagerId, 'inactive_prospect', `${p.businessName} has had no activity in 7+ days`, p.id);
      flagged++;
    }
  }

  const overdueFollowups = await prisma.followup.findMany({ where: { completed: false, dueDate: { lt: new Date() } }, include: { prospect: true } });
  for (const f of overdueFollowups) {
    if (f.prospect.assignedCallerId) await notify(f.prospect.assignedCallerId, 'follow_up_overdue', `Follow-up overdue for ${f.prospect.businessName}`, f.prospectId);
  }
  if (overdueFollowups.length > 0) {
    await notifyRoles(['admin', 'manager'], 'follow_up_overdue', `${overdueFollowups.length} follow-up(s) are overdue across the team`, null);
  }

  // safety net only - logCall already requires a next action or auto-creates a follow-up
  // for every non-closing outcome, so this mainly catches legacy/edge-case data
  const reachedToday = await prisma.activity.findMany({ where: { outcome: 'decision_maker_reached', createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } });
  let created = 0;
  for (const activity of reachedToday) {
    const existing = await prisma.followup.findFirst({ where: { prospectId: activity.prospectId, completed: false } });
    if (!existing) {
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 1);
      await prisma.followup.create({ data: { prospectId: activity.prospectId, dueDate, type: 'call', notes: 'Auto-created: reached, no follow-up scheduled' } });
      created++;
    }
  }

  return { staleProspectsFlagged: flagged, followupsAutoCreated: created, overdueNotified: overdueFollowups.length, runAt: new Date().toISOString() };
}

async function run(req, res) {
  const result = await runAutomation();
  res.json(result);
}

module.exports = { run, runAutomation };
