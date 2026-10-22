import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Period } from '../api/admin-api'
import { formatPeriodLabel, formatPeriodTitle } from '../date-range'
import type { ExerciseRow, ExerciseSlot } from '../exercise-series'
import { AXIS_TEXT, CHART_MARGIN, GRID, SURFACE } from './chart-style'
import ChartTooltip from './ChartTooltip'

interface Props {
  rows: ExerciseRow[]
  slots: ExerciseSlot[]
  period: Period
}

interface DotProps {
  index?: number
  cx?: number
  cy?: number
}

// 운동별 완료 횟수를 운동마다 한 줄로 그린 꺾은선 추이. 범례에는 선택한 기간의 운동별 합계와 평균 점수를
// 직접 적어(색에만 기대지 않게) 어떤 운동이 얼마나 쓰였는지 바로 읽히게 한다.
// 줄이 여럿이면 선 끝 글자가 겹치므로 값은 범례·툴팁·표가 맡고, 선 끝에는 점만 찍는다.
function ExerciseBreakdownChart({ rows, slots, period }: Props) {
  const last = rows.length - 1

  // 마지막 점만 표시한다. 면 색의 2px 고리가 있어 선이 겹쳐도 점이 또렷하다.
  function endDot(color: string) {
    return function EndDot({ index, cx, cy }: DotProps) {
      if (index !== last) return <g key={index} />
      return (
        <circle
          key="end"
          cx={cx}
          cy={cy}
          r={4}
          fill={color}
          stroke={SURFACE}
          strokeWidth={2}
        />
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul
        aria-label="운동별 합계"
        className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
      >
        {slots.map((slot) => (
          <li key={slot.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4 rounded-full"
              style={{ backgroundColor: slot.color }}
            />
            <span className="font-medium">{slot.name}</span>
            <span className="tabular-nums text-ink-secondary">
              {slot.totalCount.toLocaleString('ko-KR')}회
              {slot.averageScore !== null && ` · 평균 ${slot.averageScore}점`}
            </span>
          </li>
        ))}
      </ul>
      <div
        role="img"
        aria-label="기간별 운동별 완료 횟수 차트"
        className="h-64"
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 640, height: 256 }}
        >
          <LineChart data={rows} margin={CHART_MARGIN}>
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
                  unit="회"
                />
              }
            />
            {slots.map((slot) => (
              <Line
                key={slot.key}
                type="linear"
                dataKey={slot.key}
                name={slot.name}
                stroke={slot.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                dot={endDot(slot.color)}
                activeDot={{
                  r: 4,
                  fill: slot.color,
                  stroke: SURFACE,
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ExerciseBreakdownChart
