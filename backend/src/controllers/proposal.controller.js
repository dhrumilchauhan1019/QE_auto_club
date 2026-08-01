const prisma = require('../config/database');
const { log, notifyRoles } = require('../utils/log');
const { nextContractNumber } = require('../utils/contractNumber');

// "" from an empty number input isn't a valid Float for Prisma - convert to null instead
function toFloatOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
function toIntOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}
function toStringOrNull(v) {
  return v === '' || v === undefined ? null : v;
}

async function create(req, res) {
  const { prospectId, fleetSize, serviceNeeds, currentSpend, downtimeConcerns, recommendedProgram, price, options, startDate, paymentArrangement } = req.body;
  if (!prospectId) return res.status(400).json({ error: 'prospectId is required' });

  const proposal = await prisma.proposal.create({
    data: {
      prospectId,
      fleetSize: toIntOrNull(fleetSize),
      serviceNeeds: toStringOrNull(serviceNeeds),
      currentSpend: toFloatOrNull(currentSpend),
      downtimeConcerns: toStringOrNull(downtimeConcerns),
      recommendedProgram: recommendedProgram || 'Stewardship Standard',
      price: toFloatOrNull(price) ?? 25000,
      options: toStringOrNull(options),
      startDate: startDate ? new Date(startDate) : null,
      paymentArrangement: toStringOrNull(paymentArrangement)
    }
  });
  const prospect = await prisma.prospect.update({ where: { id: prospectId }, data: { status: 'proposal', lastActivityAt: new Date() } });
  log(req.user.id, 'proposal_created', 'prospect', prospectId, `$${proposal.price}`);
  notifyRoles(['admin', 'manager'], 'proposal_created', `Proposal drafted for ${prospect.businessName} ($${proposal.price.toLocaleString()})`, prospectId);
  res.status(201).json(proposal);
}

async function summary(req, res) {
  const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id }, include: { prospect: true } });
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

  res.json({
    proposal,
    identifiedProblems: [
      proposal.downtimeConcerns ? `Downtime concern: ${proposal.downtimeConcerns}` : 'Unplanned vehicle downtime risk',
      proposal.currentSpend ? `Currently spending an estimated $${proposal.currentSpend}/yr on maintenance` : 'No structured maintenance program in place'
    ],
    recommendedSolution: proposal.recommendedProgram,
    scope: proposal.serviceNeeds || 'Full-fleet stewardship coverage',
    price: proposal.price,
    nextStep: 'Schedule signature and program start date',
    acceptanceArea: 'Signature + date required to activate'
  });
}

async function updateStatus(req, res) {
  const { status } = req.body;
  if (!['draft', 'sent', 'accepted', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const proposal = await prisma.proposal.update({ where: { id: req.params.id }, data: { status }, include: { prospect: true } });

  if (status === 'sent') {
    notifyRoles(['admin', 'manager'], 'proposal_sent', `Proposal sent to ${proposal.prospect.businessName}`, proposal.prospectId);
  }

  if (status === 'accepted') {
    const contractNumber = await nextContractNumber();
    await prisma.contract.create({ data: { prospectId: proposal.prospectId, proposalId: proposal.id, amount: proposal.price, contractNumber } });
    await prisma.prospect.update({ where: { id: proposal.prospectId }, data: { status: 'contract' } });
    log(req.user.id, 'contract_created', 'prospect', proposal.prospectId, contractNumber);
    notifyRoles(['admin', 'manager'], 'contract_awaiting_signature', `Contract ${contractNumber} ready for signature — ${proposal.prospect.businessName}`, proposal.prospectId);
  }
  res.json(proposal);
}

module.exports = { create, summary, updateStatus };
