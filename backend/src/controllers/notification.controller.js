const prisma = require('../config/database');

async function list(req, res) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 30
  });
  res.json(notifications);
}

async function markRead(req, res) {
  const notification = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
  res.json(notification);
}

async function markAllRead(req, res) {
  await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
  res.json({ ok: true });
}

module.exports = { list, markRead, markAllRead };
