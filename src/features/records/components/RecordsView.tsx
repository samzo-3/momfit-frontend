import { useState, type ReactNode } from 'react'
import { monthRange, toDateKey } from '../../../shared/lib/date'
import { useCompletedDates } from '../hooks/useExerciseRecords'
import RecordSummaryPanel from './RecordSummaryPanel'
import RecordsCalendar from './RecordsCalendar'

interface RecordsViewProps {
  // 선택한 날짜("YYYY-MM-DD")의 리포트를 그린다. 다른 기능(agent-report)이라 페이지가 넘긴다.
  renderReport?: (date: string) => ReactNode
}

// 운동 기록 화면의 본문. 보고 있는 달과 선택한 날짜를 들고, 캘린더와 요약 카드를 나란히 둔다.
// 좁은 화면에서는 위아래로 쌓이고, 넓은 화면(lg 이상)에서는 좌우로 나뉜다.
function RecordsView({ renderReport }: RecordsViewProps) {
  const now = new Date()
  const todayKey = toDateKey(now)
  const [visible, setVisible] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey)

  const { from, to } = monthRange(visible.year, visible.monthIndex)
  const { dates, isError, refetch } = useCompletedDates(from, to)

  const isCurrentMonth =
    visible.year === now.getFullYear() && visible.monthIndex === now.getMonth()

  function moveMonth(offset: number) {
    const next = new Date(visible.year, visible.monthIndex + offset, 1)
    const year = next.getFullYear()
    const monthIndex = next.getMonth()
    setVisible({ year, monthIndex })
    // 이번 달로 돌아오면 오늘을, 다른 달이면 선택을 비운다. 보이지 않는 날짜가 선택된 채 남지 않게 한다.
    setSelectedDate(
      year === now.getFullYear() && monthIndex === now.getMonth()
        ? todayKey
        : null,
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <RecordsCalendar
        year={visible.year}
        monthIndex={visible.monthIndex}
        completedDates={dates}
        selectedDate={selectedDate}
        todayKey={todayKey}
        canGoNext={!isCurrentMonth}
        loadFailed={isError}
        onSelect={setSelectedDate}
        onPrevMonth={() => moveMonth(-1)}
        onNextMonth={() => moveMonth(1)}
        onRetry={() => void refetch()}
      />
      <RecordSummaryPanel
        date={selectedDate}
        completed={dates && selectedDate ? dates.has(selectedDate) : null}
        report={selectedDate ? renderReport?.(selectedDate) : null}
      />
    </div>
  )
}

export default RecordsView
