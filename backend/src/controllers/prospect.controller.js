const prisma = require('../config/database');
const { calculateScore } = require('../utils/scoring');
const { isValidEmail, normalizePhone } = require('../utils/validators');
const { log, notify } = require('../utils/log');

// stages a closer would reasonably be working once a caller has qualified the lead -
// used so closers have prospects to see even before anyone formally assigns them one
const CLOSER_VISIBLE_STAGES = ['decision_maker_reached', 'appointment', 'presentation', 'proposal', 'contract', 'payment', 'completed'];

// caller only sees their own book. closer sees anything already assigned to them as closer,
// PLUS any qualified-stage prospect nobody has claimed yet as a closer - there's currently no
// "transfer to closer" action anywhere in the app, so scoping strictly to assignedCloserId
// would leave every closer account permanently empty.
function scopeWhere(req, where = {}) {
  if (req.user.role === 'caller') where.assignedCallerId = req.user.id;
  if (req.user.role === 'closer') {
    where._roleOR = [
      { assignedCloserId: req.user.id },
      { assignedCloserId: null, status: { in: CLOSER_VISIBLE_STAGES } }
    ];
  }
  // if (!where.archived) where.archived = false;
  return where;
}

// combines the role-scoping OR (if any) with a second OR block (e.g. search) using AND,
// so neither one can silently overwrite the other
function applyOr(where, orConditions) {
  const roleOr = where._roleOR;
  delete where._roleOR;
  if (roleOr && orConditions) {
    where.AND = [{ OR: roleOr }, { OR: orConditions }];
  } else if (roleOr) {
    where.OR = roleOr;
  } else if (orConditions) {
    where.OR = orConditions;
  }
  return where;
}

async function list(req, res) {
  const { search, tier, status, archived, caller, sort = 'createdAt', order = 'desc', page = 1, pageSize = 25 } = req.query;

  const where = scopeWhere(req);

  // All / Active / Archived filter
  if (archived === "true") {
    where.archived = true;
  } else if (archived === "false") {
    where.archived = false;
  } else {
    delete where.archived; // All (default)
  }

  const searchOr = search ? [
    { businessName: { contains: search, mode: 'insensitive' } },
    { decisionMaker: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search, mode: 'insensitive' } }
  ] : null;
  applyOr(where, searchOr);

  if (tier) where.tier = tier;
  if (status) where.status = status;
  if (caller && req.user.role !== 'caller') where.assignedCallerId = caller;

  const skip = (Number(page) - 1) * Number(pageSize);
  const [items, total] = await Promise.all([
    prisma.prospect.findMany({
      where, orderBy: { [sort]: order }, skip, take: Number(pageSize),
      include: { assignedCaller: { select: { id: true, name: true } } }
    }),
    prisma.prospect.count({ where })
  ]);

  res.json({ items, total, page: Number(page), pageSize: Number(pageSize) });
}

async function getOne(req, res) {
  const prospect = await prisma.prospect.findUnique({
    where: { id: req.params.id },
    include: {
      assignedCaller: { select: { id: true, name: true } },
      activities: { orderBy: { createdAt: 'desc' }, include: { caller: { select: { name: true } } } },
      followups: { orderBy: { dueDate: 'asc' } },
      proposals: { orderBy: { createdAt: 'desc' } },
      contracts: true,
      payments: true,
      meetings: { orderBy: { scheduledAt: 'asc' } },
      scoreHistory: { orderBy: { createdAt: 'desc' } }
    }
  });
  if (!prospect) return res.status(404).json({ error: 'Prospect not found' });
  if (req.user.role === 'caller' && prospect.assignedCallerId !== req.user.id) {
    return res.status(403).json({ error: 'Not assigned to you' });
  }
  if (req.user.role === 'closer' && prospect.assignedCloserId !== req.user.id) {
    const isClaimable = !prospect.assignedCloserId && CLOSER_VISIBLE_STAGES.includes(prospect.status);
    if (!isClaimable) return res.status(403).json({ error: 'Not assigned to you' });
    // first closer to open an unclaimed qualified opportunity receives it
    await prisma.prospect.update({ where: { id: prospect.id }, data: { assignedCloserId: req.user.id } });
    prospect.assignedCloserId = req.user.id;
    log(req.user.id, 'claimed', 'prospect', prospect.id, null);
  }
  res.json(prospect);
}

async function create(req, res) {
  const data = sanitizeInput(req.body, { isCreate: true });
  const { score, tier, reason } = calculateScore(data);
  const prospect = await prisma.prospect.create({ data: { ...data, score, tier, scoreReason: reason } });
  log(req.user.id, 'created', 'prospect', prospect.id, prospect.businessName);
  res.status(201).json(prospect);
}

async function update(req, res) {
  const data = sanitizeInput(req.body);
  const existing = await prisma.prospect.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Prospect not found' });
  if (req.user.role === 'caller' && existing.assignedCallerId !== req.user.id) {
    return res.status(403).json({ error: 'Not assigned to you' });
  }
  if (req.user.role === 'closer' && existing.assignedCloserId !== req.user.id) {
    return res.status(403).json({ error: 'Not assigned to you' });
  }

  const merged = { ...existing, ...data };
  const { score, tier, reason } = calculateScore(merged);

  const prospect = await prisma.prospect.update({
    where: { id: req.params.id },
    data: { ...data, score, tier: data.overrideTier ? existing.tier : tier, scoreReason: reason }
  });

  if (data.assignedCallerId && data.assignedCallerId !== existing.assignedCallerId) {
    log(req.user.id, 'assigned_caller', 'prospect', prospect.id, data.assignedCallerId);
    notify(data.assignedCallerId, 'prospect_assigned', `${prospect.businessName} has been assigned to you`, prospect.id);
  }
  res.json(prospect);
}

async function overrideTier(req, res) {
  const { tier, reason } = req.body;
  if (!['A', 'B', 'C'].includes(tier)) return res.status(400).json({ error: 'Tier must be A, B, or C' });

  const existing = await prisma.prospect.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Prospect not found' });

  const prospect = await prisma.prospect.update({ where: { id: req.params.id }, data: { overrideTier: tier } });
  await prisma.scoreHistory.create({
    data: {
      prospectId: prospect.id, originalScore: existing.score, newScore: existing.score,
      originalTier: existing.tier, newTier: tier, reason: reason || null, overriddenById: req.user.id
    }
  });
  res.json(prospect);
}

async function archive(req, res) {
  const prospect = await prisma.prospect.update({ where: { id: req.params.id }, data: { archived: true } });
  log(req.user.id, 'archived', 'prospect', prospect.id, null);
  res.json(prospect);
}

async function remove(req, res) {
  await prisma.prospect.delete({ where: { id: req.params.id } });
  log(req.user.id, 'deleted', 'prospect', req.params.id, null);
  res.status(204).send();
}

async function exportCsv(req, res) {
  const where = scopeWhere(req);
  applyOr(where, null);
  const prospects = await prisma.prospect.findMany({ where, include: { assignedCaller: true } });
  const header = 'businessName,industry,decisionMaker,phone,email,vehicleCount,location,tier,score,status,assignedCaller,nextAction\n';
  const rows = prospects.map(p => [
    p.businessName, p.industry || '', p.decisionMaker || '', p.phone || '', p.email || '',
    p.vehicleCount, p.location || '', p.overrideTier || p.tier, p.score, p.status,
    p.assignedCaller ? p.assignedCaller.name : '', (p.nextAction || '').replace(/,/g, ';')
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="prospects_export.csv"');
  res.send(header + rows);
}

function sanitizeInput(body, { isCreate = false } = {}) {
  const out = { ...body };
  if (out.email && !isValidEmail(out.email)) delete out.email;
  if (out.phone) out.phone = normalizePhone(out.phone);
  if (out.vehicleCount) out.vehicleCount = Number(out.vehicleCount);
  if (out.urgency !== undefined) out.urgency = Number(out.urgency);
  if (out.affordability !== undefined) out.affordability = Number(out.affordability);
  if (out.serviceFrequency !== undefined) out.serviceFrequency = Number(out.serviceFrequency);
  if (out.decisionMakerAccess !== undefined) out.decisionMakerAccess = !!out.decisionMakerAccess;
  if (out.hasInternalService !== undefined) out.hasInternalService = !!out.hasInternalService;
  if (out.followUpDate) out.followUpDate = new Date(out.followUpDate);
  if (isCreate) {
    if (out.urgency === undefined) out.urgency = 3;
    if (out.affordability === undefined) out.affordability = 3;
    if (out.serviceFrequency === undefined) out.serviceFrequency = 3;
    if (out.decisionMakerAccess === undefined) out.decisionMakerAccess = false;
    if (out.hasInternalService === undefined) out.hasInternalService = false;
  }
  delete out.id; delete out.createdAt; delete out.updatedAt; delete out.archived;
  delete out.activities; delete out.followups; delete out.proposals;
  delete out.contracts; delete out.payments; delete out.assignedCaller;
  delete out.meetings; delete out.scoreHistory;
  return out;
}

module.exports = { list, getOne, create, update, overrideTier, archive, remove, exportCsv, scopeWhere };