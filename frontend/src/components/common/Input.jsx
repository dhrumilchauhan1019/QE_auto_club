export default function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs text-slate mb-1">{label}</span>}
      <input
        className={`w-full bg-ink border border-steelLight rounded-lg px-3 py-2 text-sm text-mist placeholder:text-slate/60 focus:outline-none focus:ring-2 focus:ring-copper/50 ${className}`}
        {...props}
      />
      {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
    </label>
  );
}
