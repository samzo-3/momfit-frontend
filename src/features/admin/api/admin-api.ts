import { apiRequest } from '../../../shared/api'

export type Period = 'day' | 'week' | 'month'

export interface AdminSummary {
  totalUsers: number
  newUsersToday: number
  withdrawnUsers: number
  exercisesToday: number
  visitorsToday: number
}

export interface ExerciseInfo {
  exerciseId: number
  exerciseName: string
  // 선택한 기간 안의 합계와 평균 점수(점수가 없으면 null)
  totalCount: number
  averageScore: number | null
}

export interface ExercisePoint {
  periodStart: string
  // 운동 id → 그 구간의 완료 횟수. 모든 운동이 0 포함으로 들어 있다.
  counts: Record<number, number>
}

export interface ExerciseStats {
  exercises: ExerciseInfo[]
  series: ExercisePoint[]
}

export interface UserPoint {
  periodStart: string
  signups: number
  withdrawals: number
}

export interface UserStats {
  totalSignups: number
  totalWithdrawals: number
  series: UserPoint[]
}

export interface VisitPoint {
  periodStart: string
  visitors: number
}

export interface VisitStats {
  uniqueVisitors: number
  // 오늘 기준. 조회 기간과 상관없다.
  current: { dau: number; wau: number; mau: number }
  series: VisitPoint[]
}

export interface StatsQuery {
  period: Period
  from: string
  to: string
}

// 서버는 snake_case로 응답한다. 앱 안에서는 camelCase를 쓴다.
export async function getAdminSummary(): Promise<AdminSummary> {
  const r = await apiRequest<{
    total_users: number
    new_users_today: number
    withdrawn_users: number
    exercises_today: number
    visitors_today: number
  }>('/admin/stats/summary')
  return {
    totalUsers: r.total_users,
    newUsersToday: r.new_users_today,
    withdrawnUsers: r.withdrawn_users,
    exercisesToday: r.exercises_today,
    visitorsToday: r.visitors_today,
  }
}

export async function getExerciseStats(q: StatsQuery): Promise<ExerciseStats> {
  const r = await apiRequest<{
    exercises: {
      exercise_id: number
      exercise_name: string
      total_count: number
      average_score: number | null
    }[]
    series: {
      period_start: string
      counts: { exercise_id: number; count: number }[]
    }[]
  }>('/admin/stats/exercises', { query: { ...q } })
  return {
    exercises: r.exercises.map((e) => ({
      exerciseId: e.exercise_id,
      exerciseName: e.exercise_name,
      totalCount: e.total_count,
      averageScore: e.average_score,
    })),
    series: r.series.map((p) => ({
      periodStart: p.period_start,
      counts: Object.fromEntries(p.counts.map((c) => [c.exercise_id, c.count])),
    })),
  }
}

export async function getUserStats(q: StatsQuery): Promise<UserStats> {
  const r = await apiRequest<{
    total_signups: number
    total_withdrawals: number
    series: { period_start: string; signups: number; withdrawals: number }[]
  }>('/admin/stats/users', { query: { ...q } })
  return {
    totalSignups: r.total_signups,
    totalWithdrawals: r.total_withdrawals,
    series: r.series.map((p) => ({
      periodStart: p.period_start,
      signups: p.signups,
      withdrawals: p.withdrawals,
    })),
  }
}

export async function getVisitStats(q: StatsQuery): Promise<VisitStats> {
  const r = await apiRequest<{
    unique_visitors: number
    current: { dau: number; wau: number; mau: number }
    series: { period_start: string; visitors: number }[]
  }>('/admin/stats/visits', { query: { ...q } })
  return {
    uniqueVisitors: r.unique_visitors,
    current: r.current,
    series: r.series.map((p) => ({
      periodStart: p.period_start,
      visitors: p.visitors,
    })),
  }
}
