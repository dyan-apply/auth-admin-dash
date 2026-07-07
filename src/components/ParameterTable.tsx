interface ParameterRow {
  parameter: string
  description: string
  example?: string
  required?: string
}

interface ParameterTableProps {
  title?: string
  columns: string[]
  rows: ParameterRow[]
  columnWidths?: string
}

export default function ParameterTable({
  title = 'Required Parameters',
  columns,
  rows,
  columnWidths = 'grid-cols-[120px_1fr_140px]'
}: ParameterTableProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
      <h5 className="text-xs font-semibold text-gray-300 mb-2">{title}</h5>
      <div className="space-y-2 text-xs">
        {/* Header Row */}
        <div className={`grid ${columnWidths} gap-2 pb-2 border-b border-gray-700`}>
          {columns.map((col, idx) => (
            <span key={idx} className="font-semibold text-gray-400">
              {col}
            </span>
          ))}
        </div>

        {/* Data Rows */}
        {rows.map((row, idx) => (
          <div key={idx} className={`grid ${columnWidths} gap-2`}>
            <code className="text-purple-400 break-all">{row.parameter}</code>
            <span className="text-gray-400">{row.description}</span>
            {row.example !== undefined && (
              <code className={`text-gray-300 ${row.example.length > 20 ? 'text-[10px]' : ''} ${row.example.length > 30 ? 'truncate' : ''}`} title={row.example}>
                {row.example}
              </code>
            )}
            {row.required !== undefined && (
              <span className={`${
                row.required === 'Required' ? 'text-green-400' :
                row.required === 'Recommended' ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {row.required}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
