const fs = require('fs');
const { parse } = require('csv-parse/sync');
const prisma = require('../config/database');
const { calculateScore } = require('../utils/scoring');
const { isValidEmail, isValidPhone, normalizePhone } = require('../utils/validators');

const REQUIRED_FIELDS = ['businessName'];
const KNOWN_FIELDS = [
  'businessName', 'industry', 'website', 'decisionMaker', 'decisionMakerPosition', 'phone', 'email',
  'vehicleCount', 'location', 'city', 'county', 'currentArrangement', 'leadSource', 'tier', 'score',
  'status', 'nextAction', 'notes', 'assignedCaller'
];

const STATUS_ALIASES = {
  'not contacted': 'lead', 'new': 'lead', 'lead': 'lead',
  'contacted': 'contacted', 'attempted': 'contacted',
  'decision maker reached': 'decision_maker_reached', 'dm reached': 'decision_maker_reached',
  'presentation scheduled': 'appointment', 'appointment': 'appointment',
  'presentation': 'presentation', 'presentation completed': 'presentation',
  'proposal': 'proposal', 'proposal sent': 'proposal', 'proposal requested': 'proposal',
  'contract': 'contract', 'contract sent': 'contract', 'awaiting signature': 'contract',
  'payment': 'payment', 'payment due': 'payment',
  'closed won': 'completed', 'active client': 'completed', 'completed': 'completed',
  'not interested': 'closed_lost', 'lost': 'closed_lost', 'disqualified': 'closed_lost',
  'do not contact': 'do_not_contact'
};

// columns that fold into the free-text notes field rather than their own DB column,
// so the research already in the master sheet isn't thrown away
const NOTES_SOURCE_HEADERS = ['fleet evidence', 'operating indicator', 'outreach angle', 'source url', 'verification status', 'linkedin', 'research date'];

async function preview(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const content = fs.readFileSync(req.file.path, 'utf8');
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  const filename = req.file.originalname;
  fs.unlinkSync(req.file.path);

  if (records.length === 0) return res.status(400).json({ error: 'CSV file is empty' });

  res.json({
    headers: Object.keys(records[0]),
    suggestedMapping: suggestMapping(Object.keys(records[0])),
    sampleRows: records.slice(0, 5),
    rowCount: records.length,
    allRows: records,
    filename
  });
}

async function importRows(req, res) {
  const { rows, mapping, filename } = req.body;
  if (!Array.isArray(rows) || !mapping) return res.status(400).json({ error: 'rows and mapping are required' });

  const [existing, callers] = await Promise.all([
    prisma.prospect.findMany({ select: { email: true, phone: true, businessName: true } }),
    prisma.user.findMany({ where: { role: { in: ['caller', 'closer'] } }, select: { id: true, name: true } })
  ]);
  const existingEmails = new Set(existing.map(p => (p.email || '').toLowerCase()).filter(Boolean));
  const existingPhones = new Set(existing.map(p => p.phone).filter(Boolean));
  const callerByName = new Map(callers.map(c => [c.name.toLowerCase(), c.id]));
  const seenInBatch = new Set();

  const results = { success: 0, failed: 0, duplicates: 0, errors: [] };
  const toCreate = [];

  rows.forEach((row, index) => {
    const mapped = mapRow(row, mapping);

    const rowErrors = [];
    for (const field of REQUIRED_FIELDS) {
      if (!mapped[field] || String(mapped[field]).trim() === '') rowErrors.push(`Missing required field: ${field}`);
    }
    if (mapped.email && !isValidEmail(mapped.email)) rowErrors.push(`Invalid email: ${mapped.email}`);
    if (mapped.phone && !isValidPhone(mapped.phone)) rowErrors.push(`Invalid phone: ${mapped.phone}`);

    if (rowErrors.length > 0) {
      results.failed++;
      results.errors.push({ row: index + 1, data: row, errors: rowErrors });
      return;
    }

    mapped.phone = mapped.phone ? normalizePhone(mapped.phone) : null;
    mapped.vehicleCount = parseVehicleCount(mapped.vehicleCount);

    const emailKey = (mapped.email || '').toLowerCase();
    const dupKey = emailKey || mapped.phone || mapped.businessName.toLowerCase();
    const isDup = (emailKey && existingEmails.has(emailKey)) || (mapped.phone && existingPhones.has(mapped.phone)) || seenInBatch.has(dupKey);

    if (isDup) {
      results.duplicates++;
      results.errors.push({ row: index + 1, data: row, errors: ['Duplicate record'] });
      return;
    }
    seenInBatch.add(dupKey);

    const assignedCallerId = mapped.assignedCaller ? callerByName.get(String(mapped.assignedCaller).toLowerCase()) : undefined;
    delete mapped.assignedCaller;

    let score = mapped.score !== undefined ? parseInt(mapped.score, 10) : undefined;
    let tier = mapped.tier ? String(mapped.tier).toUpperCase().trim() : undefined;
    let reason = 'Imported from spreadsheet with a pre-existing score.';
    if (score === undefined || Number.isNaN(score) || !tier) {
      const calc = calculateScore(mapped);
      score = score !== undefined && !Number.isNaN(score) ? score : calc.score;
      tier = tier && ['A', 'B', 'C'].includes(tier) ? tier : calc.tier;
      reason = calc.reason;
    }

    let status = 'lead';
    if (mapped.status) status = STATUS_ALIASES[String(mapped.status).toLowerCase().trim()] || 'lead';
    delete mapped.status;

    toCreate.push({ ...mapped, score, tier, scoreReason: reason, status, assignedCallerId });
  });

  if (toCreate.length > 0) {
    await prisma.prospect.createMany({ data: toCreate });
    results.success = toCreate.length;
  }

  await prisma.csvImport.create({
    data: {
      userId: req.user.id, filename: filename || 'upload.csv', totalRows: rows.length,
      successCount: results.success, failedCount: results.failed, duplicateCount: results.duplicates
    }
  });

  res.json(results);
}

async function history(req, res) {
  const imports = await prisma.csvImport.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { name: true } } } });
  res.json(imports);
}

function mapRow(row, mapping) {
  const mapped = {};
  const notesParts = [];
  for (const [csvCol, field] of Object.entries(mapping)) {
    const value = row[csvCol];
    if (!field || value === undefined || value === null || value === '') continue;
    if (field === 'notes' || NOTES_SOURCE_HEADERS.some(h => normalize(csvCol).includes(normalize(h)))) {
      notesParts.push(field === 'notes' ? String(value) : `${csvCol}: ${value}`);
    } else if (KNOWN_FIELDS.includes(field)) {
      mapped[field] = value;
    }
  }
  if (notesParts.length) mapped.notes = notesParts.join(' | ');
  return mapped;
}

function parseVehicleCount(value) {
  if (!value) return 0;
  const numbers = String(value).match(/\d+/g);
  if (!numbers) return 0;
  if (numbers.length === 1) return parseInt(numbers[0], 10);
  const nums = numbers.map(Number);
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function normalize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function suggestMapping(headers) {
  const mapping = {};
  // exact camelCase field-name matches first (covers re-importing our own exports)
  const fieldKeysNormalized = Object.fromEntries(KNOWN_FIELDS.map(f => [normalize(f), f]));

  // known aliases for the real-world master spreadsheet + common human-readable variants
  const aliasGroups = {
    businessName: ['company', 'businessname', 'business', 'companyname'],
    industry: ['industry', 'sector', 'businesstype'],
    website: ['website', 'url', 'web', 'websitepublicsource', 'publicsource'],
    decisionMaker: ['decisionmaker', 'contact', 'owner', 'manager'],
    decisionMakerPosition: ['title', 'position', 'decisionmakerposition', 'role'],
    phone: ['phone', 'telephone', 'mobile', 'contactnumber'],
    email: ['email', 'emailaddress'],
    vehicleCount: ['vehicles', 'vehiclecount', 'fleetsize', 'fleet', 'estimatedfleetrange'],
    location: ['location', 'address'],
    city: ['city', 'cityarea'],
    county: ['county'],
    leadSource: ['leadid', 'leadsource', 'source', 'campaign'],
    currentArrangement: ['currentarrangement', 'currentprovider', 'currentservice'],
    tier: ['tier', 'prioritytier'],
    score: ['score', 'preliminaryscore', 'priorityscore'],
    status: ['status', 'outreachstatus'],
    nextAction: ['nextaction'],
    notes: ['notes', 'comments', 'verificationstatus', 'qualificationevidence', 'decisionmakeremail', 'testdata'],
    assignedCaller: ['assignedcaller', 'caller', 'assignedto']
  };

  headers.forEach(h => {
    const norm = normalize(h);
    if (fieldKeysNormalized[norm]) { mapping[h] = fieldKeysNormalized[norm]; return; }
    for (const [field, aliases] of Object.entries(aliasGroups)) {
      if (aliases.includes(norm)) { mapping[h] = field; return; }
    }
    if (NOTES_SOURCE_HEADERS.some(alias => norm.includes(normalize(alias)))) { mapping[h] = 'notes'; }
  });
  return mapping;
}

module.exports = { preview, importRows, history };
