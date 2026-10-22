import { toDateKey } from '../../../shared/lib/date'
import { useDailyReport } from '../hooks/useDailyReport'
import DailyReportBody from './DailyReportBody'

interface DailyReportProps {
  // 캘린더에서 고른 날짜("YYYY-MM-DD")
  date: string
}

const messageClass = 'p-5 text-[15px] text-cocoa-secondary'

// 선택한 날짜의 AI 에이전트 리포트. 아직 오지 않은 날은 부르지 않는다.
function DailyReport({ date }: DailyReportProps) {
  const todayKey = toDateKey(new Date())
  const isFuture = date > todayKey
  const isPast = date < todayKey
  const { data, isFetching, isError, refetch } = useDailyReport(date, {
    isPast,
    enabled: !isFuture,
  })

  if (isFuture) {
    return <p className={messageClass}>아직 오지 않은 날이에요.</p>
  }
  // 오늘 리포트를 다시 받는 동안에는 이전 리포트를 그대로 둔다.
  if (data) return <DailyReportBody report={data} />
  if (isError && !isFetching) {
    return (
      <p
        role="alert"
        className="flex flex-wrap items-center gap-x-3 p-5 text-[15px] text-danger"
      >
        리포트를 불러오지 못했어요.
        <button
          type="button"
          onClick={() => void refetch()}
          className="font-medium text-brand-text underline underline-offset-2"
        >
          다시 시도
        </button>
      </p>
    )
  }
  // 오늘 리포트는 LLM이 새로 쓰면 십여 초가 걸린다.
  return (
    <p role="status" className={messageClass}>
      {isPast
        ? '리포트를 불러오고 있어요.'
        : '오늘 리포트를 만들고 있어요. 조금 걸릴 수 있어요.'}
    </p>
  )
}

export default DailyReport
