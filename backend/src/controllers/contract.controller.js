const prisma = require('../config/database');
const { log, notifyRoles } = require('../utils/log');

async function list(req, res) {
  const where = req.user.role === 'caller' ? { prospect: { assignedCallerId: req.user.id } } : {};
  const contracts = await prisma.contract.findMany({
    where, orderBy: { createdAt: 'desc' },
    include: { prospect: { select: { id: true, businessName: true } }, payments: true }
  });
  res.json(contracts);
}

async function sign(req, res) {
  const { signatureUrl } = req.body;
  const contract = await prisma.contract.update({
    where: { id: req.params.id },
    data: { status: 'signed', signedAt: new Date(), signatureUrl: signatureUrl || null },
    include: { prospect: true }
  });
  await prisma.prospect.update({ where: { id: contract.prospectId }, data: { status: 'payment' } });
  log(req.user.id, 'contract_signed', 'prospect', contract.prospectId, contract.contractNumber);
  notifyRoles(['admin', 'finance'], 'contract_signed', `${contract.contractNumber} signed — ${contract.prospect.businessName}, $${contract.amount.toLocaleString()} due`, contract.prospectId);
  res.json(contract);
}

module.exports = { list, sign };
