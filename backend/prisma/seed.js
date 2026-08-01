const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { calculateScore } = require('../src/utils/scoring');

const prisma = new PrismaClient();

const INDUSTRIES = ['Landscaping', 'HVAC', 'Plumbing', 'Delivery Courier', 'Electrical', 'Construction', 'Pest Control', 'Catering'];
const LOCATIONS = ['Rajkot', 'Ahmedabad', 'Surat', 'Vadodara', 'Gandhinagar'];
const STAGES = ['lead', 'lead', 'lead', 'contacted', 'decision_maker_reached', 'presentation', 'proposal'];

function randomProspect(i) {
  const industry = INDUSTRIES[i % INDUSTRIES.length];
  return {
    businessName: `${industry} Partners ${i + 1}`,
    industry,
    decisionMaker: `Owner ${i + 1}`,
    phone: `9${String(100000000 + i * 137).slice(0, 9)}`,
    email: `contact${i + 1}@example-sample.com`,
    vehicleCount: Math.floor(Math.random() * 60) + 1,
    location: LOCATIONS[i % LOCATIONS.length],
    currentArrangement: i % 3 === 0 ? 'No formal maintenance provider' : 'Independent local mechanic',
    urgency: (i % 5) + 1,
    affordability: ((i + 2) % 5) + 1,
    serviceFrequency: ((i + 1) % 5) + 1,
    decisionMakerAccess: i % 2 === 0,
    hasInternalService: i % 4 === 0,
    status: STAGES[i % STAGES.length]
  };
}

async function upsertUser(name, email, plainPassword, role) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, password: await bcrypt.hash(plainPassword, 10), role }
  });
}

async function main() {
  const admin = await upsertUser('Priya Shah', 'admin@qeautoclub.demo', 'Admin123!', 'admin');
  const executive = await upsertUser('Vikram Rao', 'executive@qeautoclub.demo', 'Executive123!', 'executive');
  const manager = await upsertUser('Arjun Mehta', 'manager@qeautoclub.demo', 'Manager123!', 'manager');
  const closer = await upsertUser('Neha Kapoor', 'closer@qeautoclub.demo', 'Closer123!', 'closer');
  const finance = await upsertUser('Sanjay Verma', 'finance@qeautoclub.demo', 'Finance123!', 'finance');
  const caller = await upsertUser('Riya Patel', 'caller@qeautoclub.demo', 'Caller123!', 'caller');
  const caller2 = await upsertUser('Karan Joshi', 'caller2@qeautoclub.demo', 'Caller123!', 'caller');
  const chisom = await upsertUser('Chisom', 'chisom@qeautoclub.demo', 'Chisom123!', 'caller');

  const count = await prisma.prospect.count();
  if (count === 0) {
    for (let i = 0; i < 40; i++) {
      const data = randomProspect(i);
      const { score, tier, reason } = calculateScore(data);
      // every 4th record goes to Chisom - a small controlled batch for her mock run,
      // the rest split between the other two demo callers
      const owner = i % 4 === 0 ? chisom.id : i % 2 === 0 ? caller.id : caller2.id;
      const p = await prisma.prospect.create({
        data: {
          ...data, score, tier, scoreReason: reason,
          assignedCallerId: owner,
          assignedCloserId: i % 6 === 0 ? closer.id : undefined,
          supervisingManagerId: manager.id
        }
      });
      if (i % 5 === 0) {
        await prisma.activity.create({ data: { prospectId: p.id, callerId: owner, outcome: 'decision_maker_reached', decisionMakerReached: true, notes: 'Sample seeded call.' } });
        await prisma.followup.create({ data: { prospectId: p.id, dueDate: new Date(Date.now() + 2 * 86400000), type: 'call', notes: 'Sample follow-up' } });
      }
    }
    console.log('Seeded 40 sample prospects (10 assigned to Chisom).');
  } else {
    console.log('Prospects already exist, skipping.');
  }

  const settingCount = await prisma.setting.count();
  if (settingCount === 0) {
    await prisma.setting.create({ data: { key: 'companyName', value: 'QE Auto Club' } });
  }

  console.log('---');
  console.log('admin@qeautoclub.demo / Admin123!');
  console.log('executive@qeautoclub.demo / Executive123!');
  console.log('manager@qeautoclub.demo / Manager123!');
  console.log('closer@qeautoclub.demo / Closer123!');
  console.log('finance@qeautoclub.demo / Finance123!');
  console.log('caller@qeautoclub.demo / Caller123!  (and caller2@qeautoclub.demo)');
  console.log('chisom@qeautoclub.demo / Chisom123!  <- her account for the mock run');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
