// Email/phone validation + normalization used by CSV import and record forms
const { parsePhoneNumberFromString } = require('libphonenumber-js');

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// Default country used ONLY when a number has no explicit country code (no leading "+").
// If your prospects are mostly US-based, leave this as 'US' and require a leading "+"
// (e.g. +91XXXXXXXXXX) for every non-US number entered or imported.
const DEFAULT_COUNTRY = 'US';

// Normalizes any phone number to strict E.164 (e.g. +919016143088, +19547588939).
// This is required for Twilio - it will reject or misdial anything else.
// Returns '' if the number can't be parsed as a valid number.
function normalizePhone(phone) {
  if (!phone) return '';
  const raw = String(phone).trim();
  const parsed = parsePhoneNumberFromString(raw, raw.startsWith('+') ? undefined : DEFAULT_COUNTRY);
  if (!parsed || !parsed.isValid()) return '';
  return parsed.number; // already E.164, e.g. "+919016143088"
}

function isValidPhone(phone) {
  if (!phone) return false;
  const raw = String(phone).trim();
  const parsed = parsePhoneNumberFromString(raw, raw.startsWith('+') ? undefined : DEFAULT_COUNTRY);
  return !!(parsed && parsed.isValid());
}

module.exports = { isValidEmail, normalizePhone, isValidPhone };
