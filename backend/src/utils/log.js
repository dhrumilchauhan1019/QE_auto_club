const prisma = require('../config/database');

// audit trail entry, silently ignores failures so logging never breaks a request.
// previousValue/newValue are optional - existing call sites that only pass details
// still work exactly as before, this just adds a real diff when callers provide one.
async function log(userId, action, entityType, entityId, details, previousValue, newValue) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entityType, entityId, details, previousValue: previousValue ?? null, newValue: newValue ?? null }
    });
  } catch (e) { /* non-critical */ }
}

async function notify(userId, type, message, prospectId) {
  if (!userId) return;
  try {
    await prisma.notification.create({ data: { userId, type, message, prospectId } });
  } catch (e) { /* non-critical */ }
}

// broadcast the same notification to every active user in the given roles,
// e.g. notifyRoles(['admin','manager'], 'contract_awaiting_signature', ...)
async function notifyRoles(roles, type, message, prospectId) {
  try {
    const users = await prisma.user.findMany({ where: { role: { in: roles }, active: true }, select: { id: true } });
    if (users.length === 0) return;
    await prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, type, message, prospectId }))
    });
  } catch (e) { /* non-critical */ }
}

// one round trip for many notifications at once, e.g. batch jobs like automation runs -
// pass [{ userId, type, message, prospectId }, ...]
async function notifyMany(entries) {
  const rows = entries.filter(e => e.userId);
  if (rows.length === 0) return;
  try {
    await prisma.notification.createMany({ data: rows });
  } catch (e) { /* non-critical */ }
}

module.exports = { log, notify, notifyRoles, notifyMany };