// "2027-01-11"까지 남은 날수. 오늘이면 0, 지났으면 음수. 날짜만 비교한다.
export function daysUntil(dueDate: string, now = new Date()): number {
  const [year, month, day] = dueDate.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // 서머타임으로 하루가 23·25시간이 되는 경우를 반올림으로 흡수한다.
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

// 남은 날수를 "D-84", "D-Day", "D+3"로 보여준다.
export function formatDday(days: number): string {
  if (days === 0) return 'D-Day'
  return days > 0 ? `D-${days}` : `D+${-days}`
}
