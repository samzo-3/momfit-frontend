import { Link } from 'react-router-dom'
import { daysUntil, formatDday } from '../due-date'
import { STAGES, stageFill, stageOf, TOTAL_WEEKS } from '../pregnancy'

interface HomeSummaryProps {
  pregnancyWeek: number | null
  // "2027-01-11"
  dueDate: string | null
  // "2027년 1월 11일"
  dueDateLabel: string
  workoutsPath: string
}

// 운동 기록 API가 생기기 전까지는 목표만 두고 완료 횟수는 0으로 둔다.
const WEEKLY_GOAL = 3
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
// 월요일부터 시작하는 한 주
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const CARD = 'rounded-3xl bg-white p-6 ring-1 ring-primary-strong'

// 임신 주차와 구간(초기·중기·후기)별 진행 막대, 출산 예정일까지 남은 날을 한 카드에 담는다.
function JourneyCard({
  pregnancyWeek,
  dueDate,
  dueDateLabel,
}: Omit<HomeSummaryProps, 'workoutsPath'>) {
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

// 이번 주 목표 횟수와 요일별 완료 표시. 아직 기록이 없어 모든 요일이 비어 있다.
function WeeklyCard({ workoutsPath }: { workoutsPath: string }) {
  const today = new Date().getDay()

  return (
    <section aria-labelledby="weekly-title" className={`${CARD} flex flex-col`}>
      <h2
        id="weekly-title"
        className="text-sm font-medium text-cocoa-secondary"
      >
        이번 주 운동
      </h2>
      <p className="mt-1 text-3xl font-semibold text-cocoa">
        0 / {WEEKLY_GOAL}회
      </p>
      <ul className="mt-4 flex gap-1.5">
        {WEEK_ORDER.map((day) => (
          <li
            key={day}
            aria-label={`${WEEKDAYS[day]}요일${day === today ? ' (오늘)' : ''}`}
            aria-current={day === today ? 'date' : undefined}
            className={`grid size-7 place-items-center rounded-full text-xs ${day === today ? 'bg-white font-semibold text-brand-text ring-2 ring-brand-text' : 'bg-primary text-cocoa-secondary'}`}
          >
            {WEEKDAYS[day]}
          </li>
        ))}
      </ul>
      {/* 안내와 링크를 한 줄에 둔다. 좁아지면 줄바꿈된다. */}
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[15px]">
        <p className="text-cocoa-secondary">아직 기록이 없어요</p>
        <Link
          to={workoutsPath}
          className="font-medium whitespace-nowrap text-brand-text hover:underline"
        >
          운동 시작하기
        </Link>
      </div>
    </section>
  )
}

// 히어로 아래 요약 영역. 왼쪽은 임신 여정, 오른쪽은 이번 주 운동이다.
function HomeSummary({
  pregnancyWeek,
  dueDate,
  dueDateLabel,
  workoutsPath,
}: HomeSummaryProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <JourneyCard
        pregnancyWeek={pregnancyWeek}
        dueDate={dueDate}
        dueDateLabel={dueDateLabel}
      />
      <WeeklyCard workoutsPath={workoutsPath} />
    </div>
  )
}

export default HomeSummary
