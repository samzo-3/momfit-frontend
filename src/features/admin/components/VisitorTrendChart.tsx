import type { Period, VisitPoint } from '../api/admin-api'
import TrendAreaChart from './TrendAreaChart'

interface Props {
  series: VisitPoint[]
  period: Period
}

// 구간별 방문자 수 추이 (일별=DAU, 주별=WAU, 월별=MAU)
function VisitorTrendChart({ series, period }: Props) {
  return (
    <TrendAreaChart
      series={series.map((p) => ({
        periodStart: p.periodStart,
        value: p.visitors,
      }))}
      period={period}
      name="방문자"
      unit="명"
      label="기간별 방문자 수 추이 차트"
    />
  )
}

export default VisitorTrendChart
