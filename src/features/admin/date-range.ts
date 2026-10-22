import type { Period } from './api/admin-api'

export type RangeDays = 7 | 30 | 90

export const RANGE_OPTIONS: { days: RangeDays; label: string }[] = [
  { days: 7, label: '최근 7일' },
  { days: 30, label: '최근 30일' },
  { days: 90, label: '최근 90일' },
]

export const PERIOD_OPTIONS: { period: Period; label: string }[] = [
  { period: 'day', label: '일별' },
  { period: 'week', label: '주별' },
  { period: 'month', label: '월별' },
]

const DAY_MS = 24 * 60 * 60 * 1000

// 한국 시간 기준 오늘("YYYY-MM-DD"). 서버가 KST로 날짜를 묶기 때문에 브라우저 시간대와 상관없이 맞춘다.
export function todayKst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
    now,
  )
}

function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS
  return new Date(t).toISOString().slice(0, 10)
}

// 오늘을 포함해 days일 전체. 예: 7일이면 오늘 포함 7일.
export function rangeForDays(days: number, now?: Date) {
  const to = todayKst(now)
  return { from: addDays(to, -(days - 1)), to }
}

// 축·표에 보일 짧은 날짜. 월별은 "10월", 그 외는 "10/22".
export function formatPeriodLabel(date: string, period: Period): string {
  const [, month, day] = date.split('-').map(Number)
  return period === 'month' ? `${month}월` : `${month}/${day}`
}

// 주별 구간은 월요일 시작이라 "10/20~" 처럼 시작일임을 드러낸다.
export function formatPeriodTitle(date: string, period: Period): string {
  const [year, month, day] = date.split('-').map(Number)
  if (period === 'month') return `${year}년 ${month}월`
  if (period === 'week') return `${month}/${day} 주`
  return `${year}년 ${month}월 ${day}일`
}
