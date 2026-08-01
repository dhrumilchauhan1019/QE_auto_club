const prisma = require('../config/database');

async function list(req, res) {
  const where = req.user.role === 'caller' ? { userId: req.user.id } : {};
  const logs = await prisma.activityLog.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 100,
    include: { user: { select: { name: true } } }
  });
  res.json(logs);
}

module.exports = { list };
