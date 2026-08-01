export default function Card({ children, className = '', title, action }) {
  return (
    <div className={`bg-steel border border-steelLight rounded-xl p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-display text-mist text-sm tracking-wide uppercase">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
