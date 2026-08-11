// One-time fix for prospects saved before the phone normalizer supported international
// numbers. Re-normalizes every stored phone number to proper E.164 (e.g. +919016143088).
//
// Numbers that are ambiguous (bare 10 digits, no "+", not a valid US number) are printed
// out instead of guessed at - go add the correct "+<countrycode>" prefix for those in the
// app UI or CSV re-import, since the script has no way to know which country they belong to.
//
// Run with:  node prisma/backfill-phones.js
//   add --apply to actually write changes, otherwise it's a dry run:
//   node prisma/backfill-phones.js --apply

const { PrismaClient } = require('@prisma/client');
const { normalizePhone, isValidPhone } = require('../src/utils/validators');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const prospects = await prisma.prospect.findMany({
    where: { phone: { not: null } },
    select: { id: true, businessName: true, phone: true },
  });

  console.log(`Checking ${prospects.length} prospect(s) with a phone number...\n`);

  let fixed = 0;
  let needsReview = 0;
  let alreadyOk = 0;

  for (const p of prospects) {
    const current = p.phone;
    if (!current) continue;

    // Already good?
    if (/^\+[1-9]\d{7,14}$/.test(current) && isValidPhone(current)) {
      alreadyOk++;
      continue;
    }

    const normalized = normalizePhone(current);

    if (normalized) {
      console.log(`FIX   ${p.businessName.padEnd(30)} "${current}"  ->  "${normalized}"`);
      fixed++;
      if (APPLY) {
        await prisma.prospect.update({ where: { id: p.id }, data: { phone: normalized } });
      }
    } else {
      console.log(`REVIEW ${p.businessName.padEnd(30)} "${current}"  -> could not determine country, needs manual fix (e.g. prefix +91)`);
      needsReview++;
    }
  }

  console.log(`\n${alreadyOk} already fine, ${fixed} ${APPLY ? 'fixed' : 'would be fixed'}, ${needsReview} need manual review.`);
  if (!APPLY && fixed > 0) {
    console.log('Dry run only - re-run with --apply to write these changes.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
