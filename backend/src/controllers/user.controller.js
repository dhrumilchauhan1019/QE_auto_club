const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { log } = require('../utils/log');

async function list(req, res) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, phone: true, createdAt: true },
    orderBy: { name: 'asc' }
  });
  res.json(users);
}

async function create(req, res) {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hashed, role: role || 'caller', phone } });
  log(req.user.id, 'user_created', 'user', user.id, user.email);
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
}

async function update(req, res) {
  const { name, role, phone, active, password } = req.body;
  const data = { name, role, phone, active };
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
  if (password) data.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active });
}

async function callerPerformance(req, res) {
  const callers = await prisma.user.findMany({ where: { role: 'caller' }, select: { id: true, name: true } });
  const stats = await Promise.all(callers.map(async c => {
    const [activeProspects, callsToday] = await Promise.all([
      prisma.prospect.count({ where: { assignedCallerId: c.id, status: { notIn: ['completed', 'closed_lost', 'do_not_contact'] } } }),
      prisma.activity.count({ where: { callerId: c.id, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } })
    ]);
    return { ...c, activeProspects, callsToday };
  }));
  res.json(stats);
}

module.exports = { list, create, update, callerPerformance };
