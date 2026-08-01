export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-2 h-8 copper-rail mx-auto mb-3 rounded-full" />
          <h1 className="font-display text-2xl text-mist">QE Auto Club</h1>
          <p className="text-slate text-sm mt-1">Stewardship Sales Command Center</p>
        </div>
        {children}
      </div>
    </div>
  );
}
