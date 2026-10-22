import { useQuery } from '@tanstack/react-query'
import { getDailyReport } from '../api/daily-report-api'

interface DailyReportOptions {
  // 오늘보다 이른 날짜인지
  isPast: boolean
  // false면 부르지 않는다. (아직 오지 않은 날)
  enabled: boolean
}

// 리포트 요청은 POST지만, 서버가 그날 기록이 그대로면 저장한 리포트를 돌려주므로 조회처럼 다룬다.
// - 지난 날짜는 서버도 다시 만들지 않으니 한 번 받으면 다시 부르지 않는다.
// - 오늘은 다시 보면 다시 부른다. 새 기록이 없으면 서버가 LLM 없이 바로 돌려준다.
// - 실패해도 자동으로 다시 시도하지 않고, 창으로 돌아올 때도 부르지 않는다. 그때마다 LLM이 불릴 수 있다.
export function useDailyReport(
  date: string,
  { isPast, enabled }: DailyReportOptions,
) {
  return useQuery({
    queryKey: ['daily-report', date],
    queryFn: () => getDailyReport(date),
    enabled,
    staleTime: isPast ? Infinity : 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
