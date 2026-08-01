export default function Select({ label, options = [], className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs text-slate mb-1">{label}</span>}
      <select
        className={`w-full bg-ink border border-steelLight rounded-lg px-3 py-2 text-sm text-mist focus:outline-none focus:ring-2 focus:ring-copper/50 ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
