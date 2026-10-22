import type { Period } from '../api/admin-api'
import { PERIOD_OPTIONS, RANGE_OPTIONS, type RangeDays } from '../date-range'

interface FilterBarProps {
  days: RangeDays
  period: Period
  onDaysChange: (days: RangeDays) => void
  onPeriodChange: (period: Period) => void
}

interface SegmentedProps<T> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex gap-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? 'bg-brand text-on-brand'
                : 'text-ink-secondary hover:bg-primary'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

// 모든 차트에 적용되는 필터를 한 줄로 차트 위에 둔다. 기간이 먼저, 묶는 단위가 다음이다.
function FilterBar({
  days,
  period,
  onDaysChange,
  onPeriodChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <Segmented
        label="조회 기간"
        value={days}
        onChange={onDaysChange}
        options={RANGE_OPTIONS.map((o) => ({ value: o.days, label: o.label }))}
      />
      <Segmented
        label="묶는 단위"
        value={period}
        onChange={onPeriodChange}
        options={PERIOD_OPTIONS.map((o) => ({
          value: o.period,
          label: o.label,
        }))}
      />
    </div>
  )
}

export default FilterBar
