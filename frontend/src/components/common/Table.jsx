export default function Table({ columns, rows, onRowClick, emptyMessage = 'No records found.' }) {
  if (!rows || rows.length === 0) {
    return <div className="text-center text-slate text-sm py-10 border border-dashed border-steelLight rounded-lg">{emptyMessage}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-steelLight text-left text-slate uppercase text-xs tracking-wide">
            {columns.map(col => <th key={col.key} className="py-2 px-3 font-medium">{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id || i}
              className={`border-b border-steelLight/50 ${onRowClick ? 'cursor-pointer hover:bg-steelLight/40' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map(col => (
                <td key={col.key} className="py-2.5 px-3 text-mist">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
