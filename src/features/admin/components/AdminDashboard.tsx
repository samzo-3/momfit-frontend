import { useMemo, useState } from 'react'
import Notice from '../../../shared/components/Notice'
import type { Period } from '../api/admin-api'
import { rangeForDays, formatPeriodLabel, type RangeDays } from '../date-range'
import { buildExerciseRows, buildExerciseSlots } from '../exercise-series'
import {
  useAdminSummary,
  useExerciseStats,
  useUserStats,
  useVisitStats,
} from '../hooks/useAdminStats'
import ChartCard from './ChartCard'
import DataTable from './DataTable'
import ExerciseBreakdownChart from './ExerciseBreakdownChart'
import FilterBar from './FilterBar'
import StatTile from './StatTile'
import UserTrendChart from './UserTrendChart'
import VisitorTrendChart from './VisitorTrendChart'

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-right">
      <span className="block text-xs text-ink-secondary">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
    </p>
  )
}

function Empty({ children }: { children: string }) {
  return (
    <p className="py-12 text-center text-[15px] text-ink-secondary">
      {children}
    </p>
  )
}

const count = (value: number, unit: string) =>
  `${value.toLocaleString('ko-KR')}${unit}`

// 묶는 단위에 따라 같은 "방문자 수"가 DAU·WAU·MAU로 불린다.
const VISIT_DESCRIPTIONS: Record<Period, string> = {
  day: '하루에 한 번이라도 방문한 회원 수 (DAU)',
  week: '한 주에 한 번이라도 방문한 회원 수 (WAU)',
  month: '한 달에 한 번이라도 방문한 회원 수 (MAU)',
}

// 관리자 현황: 요약 카드, 방문자 추이, 가입·탈퇴 추이, 운동별 완료 횟수.
// 요약 카드는 "오늘" 기준이고, 아래 차트는 위의 필터(기간·묶는 단위)를 함께 따른다.
// 차트마다 따로 불러오므로 하나가 실패해도 나머지는 보인다.
function AdminDashboard() {
  const [days, setDays] = useState<RangeDays>(30)
  const [period, setPeriod] = useState<Period>('day')
  const range = useMemo(() => rangeForDays(days), [days])
  const query = { period, ...range }

  const summary = useAdminSummary()
  const visits = useVisitStats(query)
  const exercises = useExerciseStats(query)
  const users = useUserStats(query)

  // 운동별 차트 데이터. 가장 많이 한 운동은 한 번도 안 했으면 보여 주지 않는다.
  const breakdown = useMemo(() => {
    if (!exercises.data) return null
    const { slots, keyOf } = buildExerciseSlots(exercises.data.exercises)
    const top = slots
      .filter((slot) => slot.key !== 'other')
      .reduce<(typeof slots)[number] | null>(
        (best, slot) =>
          slot.totalCount > (best?.totalCount ?? 0) ? slot : best,
        null,
      )
    return {
      slots,
      rows: buildExerciseRows(exercises.data.series, slots, keyOf),
      top,
    }
  }, [exercises.data])

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="오늘 현황" className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">오늘 현황</h2>
        {summary.isError && (
          <Notice kind="error">요약을 불러오지 못했어요.</Notice>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            label="전체 회원"
            value={summary.data?.totalUsers}
            hint="탈퇴 유예 중 제외"
          />
          <StatTile label="오늘 방문" value={summary.data?.visitorsToday} />
          <StatTile label="오늘 가입" value={summary.data?.newUsersToday} />
          <StatTile
            label="오늘 완료한 운동"
            value={summary.data?.exercisesToday}
          />
          <StatTile
            label="탈퇴 유예 중"
            value={summary.data?.withdrawnUsers}
            hint="30일 뒤 삭제"
          />
        </div>
      </section>

      <FilterBar
        days={days}
        period={period}
        onDaysChange={setDays}
        onPeriodChange={setPeriod}
      />

      {/* 카드는 한 줄에 하나씩 전체 폭으로 쌓는다. 좁은 폭에서는 헤더 수치가 줄바꿈되고 차트도 좁아진다. */}
      {visits.isError ? (
        <Notice kind="error">방문자 통계를 불러오지 못했어요.</Notice>
      ) : (
        visits.data && (
          <ChartCard
            title="방문자 수"
            description={VISIT_DESCRIPTIONS[period]}
            refreshing={visits.isPlaceholderData}
            figures={
              <>
                <Figure
                  label="오늘"
                  value={count(visits.data.current.dau, '명')}
                />
                <Figure
                  label="최근 7일"
                  value={count(visits.data.current.wau, '명')}
                />
                <Figure
                  label="최근 30일"
                  value={count(visits.data.current.mau, '명')}
                />
              </>
            }
            chart={
              <VisitorTrendChart series={visits.data.series} period={period} />
            }
            table={
              <DataTable
                caption="기간별 방문자 수"
                headers={['기간', '방문자']}
                rows={visits.data.series.map((p) => [
                  formatPeriodLabel(p.periodStart, period),
                  p.visitors,
                ])}
              />
            }
          />
        )
      )}

      {users.isError ? (
        <Notice kind="error">회원 통계를 불러오지 못했어요.</Notice>
      ) : (
        users.data && (
          <ChartCard
            title="가입·탈퇴 추이"
            description="탈퇴는 현재 유예 중인 계정의 요청일 기준"
            refreshing={users.isPlaceholderData}
            figures={
              <>
                <Figure
                  label="가입"
                  value={count(users.data.totalSignups, '명')}
                />
                <Figure
                  label="탈퇴 요청"
                  value={count(users.data.totalWithdrawals, '명')}
                />
              </>
            }
            chart={
              <UserTrendChart series={users.data.series} period={period} />
            }
            table={
              <DataTable
                caption="기간별 신규 가입과 탈퇴 요청"
                headers={['기간', '신규 가입', '탈퇴 요청']}
                rows={users.data.series.map((p) => [
                  formatPeriodLabel(p.periodStart, period),
                  p.signups,
                  p.withdrawals,
                ])}
              />
            }
          />
        )
      )}

      {exercises.isError ? (
        <Notice kind="error">운동 통계를 불러오지 못했어요.</Notice>
      ) : (
        breakdown && (
          <ChartCard
            title="운동별 완료 횟수"
            description={`${range.from} ~ ${range.to} · 운동마다 완료한 횟수`}
            refreshing={exercises.isPlaceholderData}
            figures={
              breakdown.top && (
                <Figure label="가장 많이 한 운동" value={breakdown.top.name} />
              )
            }
            chart={
              breakdown.slots.every((slot) => slot.totalCount === 0) ? (
                <Empty>이 기간에 완료한 운동이 없어요.</Empty>
              ) : (
                <ExerciseBreakdownChart
                  rows={breakdown.rows}
                  slots={breakdown.slots}
                  period={period}
                />
              )
            }
            table={
              <DataTable
                caption="기간별 운동별 완료 횟수"
                headers={['기간', ...breakdown.slots.map((slot) => slot.name)]}
                rows={[
                  ...breakdown.rows.map((row) => [
                    formatPeriodLabel(row.periodStart, period),
                    ...breakdown.slots.map((slot) => row[slot.key] as number),
                  ]),
                  ['합계', ...breakdown.slots.map((slot) => slot.totalCount)],
                  [
                    '평균 점수',
                    ...breakdown.slots.map((slot) =>
                      slot.averageScore === null
                        ? '–'
                        : `${slot.averageScore}점`,
                    ),
                  ],
                ]}
              />
            }
          />
        )
      )}
    </div>
  )
}

export default AdminDashboard
