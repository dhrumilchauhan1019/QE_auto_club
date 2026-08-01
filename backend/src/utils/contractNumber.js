const prisma = require('../config/database');

// human-readable contract number, e.g. QEAC-2026-00042, instead of a raw database id
async function nextContractNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.contract.count();
  const seq = String(count + 1).padStart(5, '0');
  const candidate = `QEAC-${year}-${seq}`;

  // extremely unlikely, but guard against a collision if two contracts are created in the same tick
  const exists = await prisma.contract.findUnique({ where: { contractNumber: candidate } });
  if (exists) return `QEAC-${year}-${String(count + 1 + Math.floor(Math.random() * 100)).padStart(5, '0')}`;
  return candidate;
}

module.exports = { nextContractNumber };
