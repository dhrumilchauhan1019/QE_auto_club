export function Loader({ label = 'Loading...' }) {
  return (
    <div className="flex items-center gap-2 text-slate text-sm py-6 justify-center">
      <span className="w-3 h-3 rounded-full border-2 border-copper border-t-transparent animate-spin" />
      {label}
    </div>
  );
}

export function TierBadge({ tier }) {
  const colors = { A: 'bg-tierA/10 text-tierA border-tierA/30', B: 'bg-tierB/10 text-tierB border-tierB/30', C: 'bg-tierC/10 text-tierC border-tierC/30' };
  return <span className={`inline-block px-2 py-0.5 rounded border text-xs font-mono-data ${colors[tier] || colors.C}`}>Tier {tier}</span>;
}

export function StatusPill({ status }) {
  const label = (status || '').replace(/_/g, ' ');
  return <span className="inline-block px-2 py-0.5 rounded-full bg-steelLight text-mist text-xs capitalize">{label}</span>;
}
