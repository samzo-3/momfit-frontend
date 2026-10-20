// 시각(ISO 8601, 예: "2026-11-19T03:00:00Z") → 사용자 기기 시간대 기준 "2026년 11월 19일"
export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

// "2027-01-11" → "2027년 1월 11일". 값이 없으면 "-"
export function formatDate(value: string | null): string {
  if (!value) return '-'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return `${year}년 ${month}월 ${day}일`
}
