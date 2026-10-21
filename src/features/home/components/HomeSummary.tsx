import { Link } from 'react-router-dom'
import { daysUntil, formatDday } from '../due-date'
import { toDateKey, weekDates } from '../../../shared/lib/date'
import { STAGES, stageFill, stageOf, TOTAL_WEEKS } from '../pregnancy'

interface HomeSummaryProps {
  pregnancyWeek: number | null
  // "2027-01-11"
  dueDate: string | null
  // "2027년 1월 11일"
  dueDateLabel: string
  // 운동 기록 캘린더 화면 경로
  recordsPath: string
  // 이번 주에 운동을 마친 날짜("2026-10-19"). 아직 불러오는 중이거나 실패했으면 null
  completedDates: ReadonlySet<string> | null
  // 기록 조회에 실패했는지. 실패해도 오류를 띄우지 않고, 기록과 무관한 시작 버튼만 보여준다.
  loadFailed: boolean
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const CARD = 'rounded-3xl bg-white p-6 ring-1 ring-primary-strong'

// 임신 주차와 구간(초기·중기·후기)별 진행 막대, 출산 예정일까지 남은 날을 한 카드에 담는다.
function JourneyCard({
  pregnancyWeek,
  dueDate,
  dueDateLabel,
}: Omit<HomeSummaryProps, 'recordsPath' | 'completedDates' | 'loadFailed'>) {
  const stage = stageOf(pregnancyWeek)

  return (
    <section
      aria-labelledby="journey-title"
      className={`${CARD} flex flex-col`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="journey-title"
            className="text-sm font-medium text-cocoa-secondary"
          >
            출산까지의 여정
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-semibold text-cocoa">
            {pregnancyWeek === null ? '-' : `임신 ${pregnancyWeek}주차`}
            {stage && (
              <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-xs font-medium text-sage">
                {stage.label}
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-cocoa-secondary">
            출산 예정일
          </p>
          <p className="mt-1 text-3xl font-semibold text-brand-text">
            {dueDate ? formatDday(daysUntil(dueDate)) : '-'}
          </p>
          <p className="text-[15px] text-cocoa-secondary">{dueDateLabel}</p>
        </div>
      </div>

      {/* 40주를 초기·중기·후기 세 구간으로 나눠 현재 주차까지 채운다. 구간 길이에 비례해 폭을 나눈다. */}
      <div
        role="progressbar"
        aria-label="임신 진행"
        aria-valuemin={0}
        aria-valuemax={TOTAL_WEEKS}
        aria-valuenow={pregnancyWeek ?? 0}
        aria-valuetext={
          pregnancyWeek === null
            ? '주차를 알 수 없음'
            : `${TOTAL_WEEKS}주 중 ${pregnancyWeek}주차`
        }
        className="mt-auto flex gap-1 pt-6"
      >
        {STAGES.map((item) => (
          <span
            key={item.key}
            style={{ flexGrow: item.to - item.from + 1 }}
            className="h-2 basis-0 overflow-hidden rounded-full bg-primary-strong"
          >
            <span
              data-testid={`stage-fill-${item.key}`}
              style={{ width: `${stageFill(item, pregnancyWeek) * 100}%` }}
              className="block h-full rounded-full bg-brand-text"
            />
          </span>
        ))}
      </div>
      <ul aria-hidden="true" className="mt-2 flex gap-1 text-xs">
        {STAGES.map((item) => (
          <li
            key={item.key}
            style={{ flexGrow: item.to - item.from + 1 }}
            className={`basis-0 ${stage?.key === item.key ? 'font-semibold text-cocoa' : 'text-cocoa-secondary'}`}
          >
            {item.label} {item.from}-{item.to}주
          </li>
        ))}
      </ul>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  )
}

// 이번 주 운동 상태에 맞는 한마디. 목표나 평가가 아니라 응원하는 말투로 둔다.
function encouragement(doneToday: boolean, doneCount: number): string {
  if (doneToday) return '오늘도 수고했어요'
  if (doneCount > 0) return '쉬어가는 날도 괜찮아요'
  return '오늘도 천천히, 내 속도로'
}

// 이번 주(월~일) 운동 현황. 운동을 마친 날은 체크로 채우고, 오늘 할 일(시작 버튼)을 이어서 보여준다.
function WeeklyCard({
  recordsPath,
  completedDates,
  loadFailed,
}: Pick<HomeSummaryProps, 'recordsPath' | 'completedDates' | 'loadFailed'>) {
  const todayKey = toDateKey(new Date())
  const days = weekDates(new Date())
  const doneCount = completedDates
    ? days.filter((day) => completedDates.has(toDateKey(day))).length
    : 0
  const doneToday = completedDates?.has(todayKey) ?? false
  // 불러오는 중에는 아래 행동 영역을 비운다. 실패했으면 기록과 무관한 내용만 보여준다.
  const loading = completedDates === null && !loadFailed

  return (
    <section aria-labelledby="weekly-title" className={`${CARD} flex flex-col`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="weekly-title"
          className="text-sm font-medium text-cocoa-secondary"
        >
          이번 주 운동
        </h2>
        <Link
          to={recordsPath}
          className="text-sm font-medium whitespace-nowrap text-brand-text hover:underline"
        >
          운동 기록 보기
          <span aria-hidden="true"> →</span>
        </Link>
      </div>
      {/* 좁은 카드에서도 한 줄로 보이게 문구를 짧게 두고 줄바꿈을 막는다.
          불러오는 동안에도 높이를 지켜 카드가 출렁이지 않게 한다. */}
      <p
        data-testid="weekly-summary"
        className="mt-1 min-h-7 text-xl font-semibold whitespace-nowrap text-cocoa"
      >
        {completedDates === null
          ? ''
          : doneCount > 0
            ? `${doneCount}일 운동했어요`
            : '첫 운동을 시작해 볼까요?'}
      </p>

      <ul className="mt-5 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = toDateKey(day)
          const isToday = key === todayKey
          const done = completedDates?.has(key) ?? false
          return (
            <li
              key={key}
              aria-label={`${WEEKDAYS[day.getDay()]}요일${isToday ? ' (오늘)' : ''}${done ? ', 운동 완료' : ''}`}
              aria-current={isToday ? 'date' : undefined}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                className={`text-xs ${isToday ? 'font-semibold text-brand-text' : 'text-cocoa-secondary'}`}
              >
                {WEEKDAYS[day.getDay()]}
              </span>
              <span
                aria-hidden="true"
                className={`grid size-9 place-items-center rounded-full text-sm ${done ? 'bg-brand text-on-brand' : 'bg-primary text-cocoa-secondary'} ${isToday ? 'font-semibold ring-2 ring-brand-text ring-offset-2' : ''}`}
              >
                {done ? <CheckIcon /> : day.getDate()}
              </span>
            </li>
          )
        })}
      </ul>

      {/* 오늘 운동을 마쳤으면 완료 표시, 그리고 응원 한마디. 불러오는 중에는 비워 둔다. */}
      <div className="mt-auto flex flex-col items-center gap-3 pt-6">
        {!loading && doneToday && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-4 py-2 text-[15px] font-medium text-sage">
            <CheckIcon />
            오늘 운동 완료
          </p>
        )}
        {!loading && (
          <p className="text-sm text-cocoa-secondary">
            {encouragement(doneToday, doneCount)}
          </p>
        )}
      </div>
    </section>
  )
}

// 히어로 아래 요약 영역. 왼쪽은 임신 여정, 오른쪽은 이번 주 운동이다.
function HomeSummary({
  pregnancyWeek,
  dueDate,
  dueDateLabel,
  recordsPath,
  completedDates,
  loadFailed,
}: HomeSummaryProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <JourneyCard
        pregnancyWeek={pregnancyWeek}
        dueDate={dueDate}
        dueDateLabel={dueDateLabel}
      />
      <WeeklyCard
        recordsPath={recordsPath}
        completedDates={completedDates}
        loadFailed={loadFailed}
      />
    </div>
  )
}

export default HomeSummary
