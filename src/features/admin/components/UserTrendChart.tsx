import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Period, UserPoint } from '../api/admin-api'
import { formatPeriodLabel, formatPeriodTitle } from '../date-range'
import {
  AXIS_TEXT,
  CHART_MARGIN,
  GRID,
  SERIES_1,
  SERIES_2,
  SURFACE,
} from './chart-style'
import ChartTooltip from './ChartTooltip'

interface Props {
  series: UserPoint[]
  period: Period
}

const LEGEND = [
  { name: '신규 가입', color: SERIES_1 },
  { name: '탈퇴 요청', color: SERIES_2 },
]

interface DotProps {
  index?: number
  cx?: number
  cy?: number
  value?: number
}

// 신규 가입과 탈퇴 요청 추이. 계열이 둘이라 범례를 두고, 마지막 값만 선 끝에 직접 적는다.
function UserTrendChart({ series, period }: Props) {
  const last = series.length - 1

  // 마지막 점에만 표시(점 + 값). 글자는 계열 색이 아니라 본문색을 쓴다.
  function endMark(color: string) {
    return function EndMark(props: DotProps) {
      if (props.index !== last) return <g key={props.index} />
      return (
        <g key="end">
          <circle
            cx={props.cx}
            cy={props.cy}
            r={4}
            fill={color}
            stroke={SURFACE}
            strokeWidth={2}
          />
          <text
            x={(props.cx ?? 0) + 10}
            y={(props.cy ?? 0) + 4}
            fontSize={12}
            fontWeight={600}
            fill="#1d1d1f"
          >
            {props.value}
          </text>
        </g>
      )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex gap-4 text-sm text-ink-secondary" aria-label="범례">
        {LEGEND.map((item) => (
          <li key={item.name} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.name}
          </li>
        ))}
      </ul>
      <div
        role="img"
        aria-label="기간별 신규 가입과 탈퇴 요청 추이 차트"
        className="h-56"
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 480, height: 224 }}
        >
          <LineChart data={series} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="periodStart"
              tickFormatter={(value: string) =>
                formatPeriodLabel(value, period)
              }
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
                  unit="명"
                />
              }
            />
            <Line
              type="linear"
              dataKey="signups"
              name="신규 가입"
              stroke={SERIES_1}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={endMark(SERIES_1)}
              activeDot={{
                r: 4,
                fill: SERIES_1,
                stroke: SURFACE,
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="withdrawals"
              name="탈퇴 요청"
              stroke={SERIES_2}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={endMark(SERIES_2)}
              activeDot={{
                r: 4,
                fill: SERIES_2,
                stroke: SURFACE,
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default UserTrendChart
