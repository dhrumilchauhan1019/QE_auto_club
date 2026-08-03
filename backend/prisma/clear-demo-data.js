const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.prospect.count();
  if (count === 0) {
    console.log('No prospects in the database - nothing to clear.');
    return;
  }

  console.log(`Found ${count} prospect(s). Clearing all prospect-linked data...`);

  // children first, in dependency order, then the prospects themselves
  const payments = await prisma.payment.deleteMany({});
  const contracts = await prisma.contract.deleteMany({});
  const proposals = await prisma.proposal.deleteMany({});
  const meetings = await prisma.meeting.deleteMany({});
  const followups = await prisma.followup.deleteMany({});
  const activities = await prisma.activity.deleteMany({});
  const scoreHistory = await prisma.scoreHistory.deleteMany({});
  const notifications = await prisma.notification.deleteMany({});
  const activityLogs = await prisma.activityLog.deleteMany({ where: { entityType: 'prospect' } });
  const prospects = await prisma.prospect.deleteMany({});

  console.log('Cleared:');
  console.log(`  ${prospects.count} prospects`);
  console.log(`  ${activities.count} activities, ${followups.count} follow-ups, ${meetings.count} meetings`);
  console.log(`  ${proposals.count} proposals, ${contracts.count} contracts, ${payments.count} payments`);
  console.log(`  ${scoreHistory.count} score history entries, ${notifications.count} notifications`);
  console.log(`  ${activityLogs.count} prospect-related activity log entries`);
  console.log('---');
  console.log('User accounts were NOT touched - all logins still work.');
  console.log('Database is ready for a real CSV import.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());