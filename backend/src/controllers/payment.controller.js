const prisma = require('../config/database');
const { log, notifyRoles } = require('../utils/log');

async function list(req, res) {
  const where = req.user.role === 'caller' ? { prospect: { assignedCallerId: req.user.id } } : {};
  const payments = await prisma.payment.findMany({
    where, orderBy: { collectedAt: 'desc' },
    include: { prospect: { select: { id: true, businessName: true } }, contract: true }
  });
  res.json(payments);
}

async function create(req, res) {
  const { prospectId, contractId, amount, dueDate } = req.body;
  if (!prospectId || !amount) return res.status(400).json({ error: 'prospectId and amount are required' });
  const cleanContractId = contractId || null;

  const payment = await prisma.payment.create({ data: { prospectId, contractId: cleanContractId, amount: Number(amount), dueDate: dueDate ? new Date(dueDate) : null } });

  if (cleanContractId) {
    const contract = await prisma.contract.findUnique({ where: { id: cleanContractId }, include: { payments: true, prospect: true } });
    const collected = contract.payments.reduce((s, p) => s + p.amount, 0);
    if (collected >= contract.amount) {
      await prisma.prospect.update({ where: { id: prospectId }, data: { status: 'completed' } });
      log(req.user.id, 'fully_collected', 'prospect', prospectId, `$${collected}`);
      notifyRoles(['admin', 'manager'], 'payment_collected', `${contract.prospect.businessName} fully paid — $${collected.toLocaleString()} collected`, prospectId);
    }
  }

  res.status(201).json(payment);
}

module.exports = { list, create };
