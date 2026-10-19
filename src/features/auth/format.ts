// "2027-01-11" → "2027년 1월 11일". 값이 없으면 "-"
export function formatDate(value: string | null): string {
  if (!value) return '-'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return `${year}년 ${month}월 ${day}일`
}
