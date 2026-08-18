import { useMemo, useState, useEffect } from 'react';

// Common countries first (US business + India, since that's what this app dials today),
// then the rest alphabetically. Add more here any time - just needs a dial code + ISO name.
const COUNTRIES = [
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
];

// Splits a stored E.164 number (e.g. "+919016143088") into { dialCode: '+91', rest: '9016143088' }
// for display. Falls back to +1 (US) if the number doesn't start with a known dial code, or if
// it's not in E.164 form yet (e.g. freshly typed, not yet submitted).
function splitPhone(value) {
  if (!value) return { dialCode: '+1', rest: '' };
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length); // longest code first (+971 before +91 etc.)
  const match = sorted.find((c) => value.startsWith(c.code));
  if (match) return { dialCode: match.code, rest: value.slice(match.code.length).trim() };
  return { dialCode: '+1', rest: value.replace(/^\+/, '') };
}

// A phone input styled like [flag + dial code dropdown] [number field], which always composes
// its output as a single E.164-ish string ("+<dialcode><digits>") passed to onChange - exactly
// the format the backend's normalizePhone() expects and the format numbers are stored in.
export default function PhoneInput({ label = 'Phone number', value, onChange, error, required }) {
  const [dialCode, setDialCode] = useState('+1');
  const [rest, setRest] = useState('');

  // Keep local display state in sync if the parent resets/loads a different value
  // (e.g. opening the edit modal for a different prospect).
  useEffect(() => {
    const split = splitPhone(value);
    setDialCode(split.dialCode);
    setRest(split.rest);
  }, [value]);

  function emit(nextDialCode, nextRest) {
    const digits = nextRest.replace(/[^\d]/g, '');
    onChange(digits ? `${nextDialCode}${digits}` : '');
  }

  return (
    <label className="block">
      {label && (
        <span className="block text-xs text-slate mb-1">
          {label}
          {required && <span className="text-copper"> *</span>}
        </span>
      )}
      <div className="flex gap-2">
        <select
          value={dialCode}
          onChange={(e) => {
            setDialCode(e.target.value);
            emit(e.target.value, rest);
          }}
          className="bg-ink border border-steelLight rounded-lg px-2 py-2 text-sm text-mist focus:outline-none focus:ring-2 focus:ring-copper/50 w-[110px] shrink-0"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={rest}
          onChange={(e) => {
            setRest(e.target.value);
            emit(dialCode, e.target.value);
          }}
          placeholder="Phone number"
          className="w-full bg-ink border border-steelLight rounded-lg px-3 py-2 text-sm text-mist placeholder:text-slate/60 focus:outline-none focus:ring-2 focus:ring-copper/50"
        />
      </div>
      {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
    </label>
  );
}