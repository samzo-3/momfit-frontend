import type { ReactNode } from 'react'
import { parseDateKey, WEEKDAY_LABELS } from '../../../shared/lib/date'

interface RecordSummaryPanelProps {
  // 선택한 날짜("YYYY-MM-DD"). 없으면 안내만 보여준다.
  date: string | null
  // 그 날 운동을 마친 기록이 있는지. 아직 모르면 null
  completed: boolean | null
  // 날짜 머리글 아래 영역에 그릴 AI 에이전트 리포트. 페이지가 조합해서 넘긴다.
  report?: ReactNode
}

// 캘린더 오른쪽 카드. 날짜 머리글 아래에 선택한 날짜의 AI 요약 리포트를 둔다.
function RecordSummaryPanel({
  date,
  completed,
  report,
}: RecordSummaryPanelProps) {
  const selected = date ? parseDateKey(date) : null

  return (
    <section
      aria-labelledby="records-summary-title"
      className="flex flex-col rounded-3xl bg-primary p-6 ring-1 ring-primary-strong"
    >
      <div className="flex items-center justify-between gap-3">
        {selected && (
          <span className="rounded-full bg-white px-3 py-1 text-[13px] font-medium text-brand-text">
            {selected.getMonth() + 1}월 {selected.getDate()}일 · 운동 기록
          </span>
        )}
        {completed !== null && selected && (
          <span className="text-[13px] font-medium text-sage">
            {completed ? '기록 완료' : '기록 없음'}
          </span>
        )}
      </div>
      <h2
        id="records-summary-title"
        className="mt-4 text-[19px] font-semibold text-cocoa"
      >
        선택한 날짜의 기록
      </h2>
      <p className="mt-1 text-[15px] text-cocoa-secondary">
        {selected
          ? `${selected.getFullYear()}년 ${selected.getMonth() + 1}월 ${selected.getDate()}일 (${WEEKDAY_LABELS[selected.getDay()]})`
          : '캘린더에서 날짜를 골라 주세요.'}
      </p>
      {/* AI 에이전트의 날짜별 운동 요약 리포트가 들어올 자리 */}
      <div
        data-testid="records-report-slot"
        className="mt-5 min-h-48 flex-1 rounded-2xl bg-white/60 ring-1 ring-primary-strong"
      >
        {report}
      </div>
    </section>
  )
}

export default RecordSummaryPanel
