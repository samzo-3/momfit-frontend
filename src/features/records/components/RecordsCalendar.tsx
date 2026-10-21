import {
  monthCells,
  parseDateKey,
  WEEKDAY_LABELS,
} from '../../../shared/lib/date'

interface RecordsCalendarProps {
  year: number
  // 0부터(0 = 1월)
  monthIndex: number
  // 운동을 마친 날짜("YYYY-MM-DD"). 아직 모르면 null
  completedDates: ReadonlySet<string> | null
  selectedDate: string | null
  todayKey: string
  canGoNext: boolean
  loadFailed: boolean
  onSelect: (dateKey: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onRetry: () => void
}

const ROUND_BUTTON =
  'grid size-8 place-items-center rounded-full bg-primary text-cocoa transition-colors hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary'

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === 'left' ? 'M12 5l-5 5 5 5' : 'M8 5l5 5-5 5'} />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-[18px] text-brand-text"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" />
      <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
    </svg>
  )
}

// 일요일부터 시작하는 7열에서 index번째 칸이 일요일(0)이나 토요일(6)인지
function isWeekend(index: number): boolean {
  const column = index % 7
  return column === 0 || column === 6
}

function dayLabel(dateKey: string, completed: boolean, isToday: boolean) {
  const date = parseDateKey(dateKey)
  const base = `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_LABELS[date.getDay()]}요일`
  return `${base}${isToday ? ' (오늘)' : ''}${completed ? ', 운동 기록 있음' : ''}`
}

// 한 달 달력. 운동을 마친 날은 살구색 칸과 점으로 표시하고, 날짜를 누르면 선택한다.
function RecordsCalendar({
  year,
  monthIndex,
  completedDates,
  selectedDate,
  todayKey,
  canGoNext,
  loadFailed,
  onSelect,
  onPrevMonth,
  onNextMonth,
  onRetry,
}: RecordsCalendarProps) {
  const cells = monthCells(year, monthIndex)

  return (
    <section
      aria-labelledby="records-calendar-title"
      className="rounded-3xl bg-white p-6 ring-1 ring-primary-strong"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="records-calendar-title"
          className="flex items-center gap-2 text-[17px] font-medium text-cocoa"
        >
          <CalendarIcon />
          운동 캘린더
        </h2>
        <div className="flex items-center gap-2">
          <p
            aria-live="polite"
            className="mr-1 text-[15px] font-semibold text-cocoa"
          >
            {year}년 {monthIndex + 1}월
          </p>
          <button
            type="button"
            aria-label="이전 달"
            onClick={onPrevMonth}
            className={ROUND_BUTTON}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            aria-label="다음 달"
            disabled={!canGoNext}
            onClick={onNextMonth}
            className={ROUND_BUTTON}
          >
            <Chevron direction="right" />
          </button>
        </div>
      </div>

      {loadFailed && (
        <p
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-x-3 text-[15px] text-danger"
        >
          운동 기록을 불러오지 못했어요.
          <button
            type="button"
            onClick={onRetry}
            className="font-medium text-brand-text underline underline-offset-2"
          >
            다시 시도
          </button>
        </p>
      )}

      <div
        role="group"
        aria-label={`${year}년 ${monthIndex + 1}월`}
        aria-busy={completedDates === null && !loadFailed}
        className="mt-5"
      >
        <ul
          aria-hidden="true"
          className="grid grid-cols-7 rounded-full bg-primary py-1.5 text-center text-[13px]"
        >
          {WEEKDAY_LABELS.map((label, index) => (
            <li
              key={label}
              className={
                isWeekend(index) ? 'text-danger' : 'text-cocoa-secondary'
              }
            >
              {label}
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-7 gap-y-1.5">
          {cells.map((dateKey, index) => {
            if (!dateKey)
              return <span key={`blank-${index}`} aria-hidden="true" />

            const completed = completedDates?.has(dateKey) ?? false
            const selected = dateKey === selectedDate
            const isToday = dateKey === todayKey
            const weekend = isWeekend(index)
            const tone = selected
              ? 'bg-brand font-semibold text-on-brand'
              : completed
                ? 'bg-primary text-cocoa hover:bg-primary-strong'
                : `${weekend ? 'text-danger' : 'text-cocoa'} hover:bg-primary-soft`

            return (
              <button
                key={dateKey}
                type="button"
                aria-label={dayLabel(dateKey, completed, isToday)}
                aria-pressed={selected}
                aria-current={isToday ? 'date' : undefined}
                onClick={() => onSelect(dateKey)}
                className={`mx-auto flex h-11 w-full max-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl text-[15px] transition-colors ${tone} ${isToday && !selected ? 'ring-1 ring-brand-text' : ''}`}
              >
                <span aria-hidden="true">
                  {parseDateKey(dateKey).getDate()}
                </span>
                <span
                  aria-hidden="true"
                  className={`size-1 rounded-full ${completed ? (selected ? 'bg-on-brand' : 'bg-brand-text') : 'bg-transparent'}`}
                />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default RecordsCalendar
