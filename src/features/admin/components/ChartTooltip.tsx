interface TooltipRow {
  name?: string | number
  value?: string | number
  color?: string
}

interface ChartTooltipProps {
  // Recharts가 hover 중인 값을 넣어 준다.
  active?: boolean
  payload?: readonly TooltipRow[]
  label?: string | number
  title: (label: string) => string
  unit?: string
}

// 값이 먼저 눈에 들어오고 계열 이름은 보조로 둔다. 계열은 색 네모가 아니라 짧은 선으로 구분한다.
function ChartTooltip({
  active,
  payload,
  label,
  title,
  unit = '',
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-line">
      <p className="mb-1 text-xs text-ink-secondary">{title(String(label))}</p>
      <ul className="flex flex-col gap-0.5">
        {payload.map((row, index) => (
          <li key={`${row.name}-${index}`} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-3 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="font-semibold text-ink">
              {typeof row.value === 'number'
                ? row.value.toLocaleString('ko-KR')
                : row.value}
              {unit}
            </span>
            <span className="text-ink-secondary">{row.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ChartTooltip
