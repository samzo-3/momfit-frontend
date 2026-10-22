interface DataTableProps {
  caption: string
  headers: string[]
  rows: (string | number)[][]
}

// 차트와 같은 값을 표로 보여 준다. 마우스 없이도, 스크린리더로도 모든 값을 읽을 수 있게 하는 대체 화면이다.
function DataTable({ caption, headers, rows }: DataTableProps) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-white text-ink-secondary">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="py-2 pr-4 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])} className="border-t border-line/60">
              {row.map((cell, index) => (
                <td key={index} className="py-2 pr-4 tabular-nums">
                  {typeof cell === 'number'
                    ? cell.toLocaleString('ko-KR')
                    : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
