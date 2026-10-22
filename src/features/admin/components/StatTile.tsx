interface StatTileProps {
  label: string
  value: number | undefined
  hint?: string
}

// 숫자 하나가 곧 차트인 값은 막대가 아니라 숫자로 보여 준다.
function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl bg-white p-5 ring-1 ring-primary-strong">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="text-4xl font-semibold" aria-live="polite">
        {value === undefined ? '–' : value.toLocaleString('ko-KR')}
      </p>
      {hint && <p className="text-xs text-ink-secondary">{hint}</p>}
    </div>
  )
}

export default StatTile
