import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Period } from '../api/admin-api'
import { formatPeriodLabel, formatPeriodTitle } from '../date-range'
import { AXIS_TEXT, CHART_MARGIN, GRID, SERIES_1, SURFACE } from './chart-style'
import ChartTooltip from './ChartTooltip'

export interface TrendPoint {
  periodStart: string
  value: number
}

interface Props {
  series: TrendPoint[]
  period: Period
  // 툴팁에 보이는 계열 이름과 단위, 스크린리더용 차트 설명
  name: string
  unit: string
  label: string
}

// 구간별 값 하나를 보여 주는 면적 추이 차트. 계열이 하나라 범례는 없고 카드 제목이 무엇인지 말해 준다.
function TrendAreaChart({ series, period, name, unit, label }: Props) {
  const last = series.length - 1

  return (
    <div role="img" aria-label={label} className="h-64">
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 640, height: 256 }}
      >
        <AreaChart data={series} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="periodStart"
            tickFormatter={(value: string) => formatPeriodLabel(value, period)}
            tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            width={32}
            tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: GRID }}
            content={
              <ChartTooltip
                title={(label) => formatPeriodTitle(label, period)}
                unit={unit}
              />
            }
          />
          <Area
            type="linear"
            dataKey="value"
            name={name}
            stroke={SERIES_1}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill={SERIES_1}
            fillOpacity={0.1}
            // 마지막 점만 표시한다. 지금 값이 어디서 끝나는지만 보이면 충분하다.
            dot={(props: { index?: number; cx?: number; cy?: number }) =>
              props.index === last ? (
                <circle
                  key="end"
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill={SERIES_1}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              ) : (
                <g key={props.index} />
              )
            }
            activeDot={{
              r: 4,
              fill: SERIES_1,
              stroke: SURFACE,
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TrendAreaChart
