// 날짜를 "2026-10-19" 같은 키로 다룬다. 모두 브라우저 로컬 날짜 기준이다.

export const WEEKDAY_LABELS = [
  '일',
  '월',
  '화',
  '수',
  '목',
  '금',
  '토',
] as const

export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// "2026-10-19" → 그 날 정오의 Date. 정오로 두어 시간대·DST 경계에서 날짜가 밀리지 않게 한다.
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

// monthIndex는 0부터(0 = 1월)
export function monthRange(year: number, monthIndex: number) {
  return {
    from: toDateKey(new Date(year, monthIndex, 1)),
    to: toDateKey(new Date(year, monthIndex + 1, 0)),
  }
}

// 달력에 그릴 칸. 일요일부터 시작하고, 1일 앞은 null로 채운다. 마지막 날 뒤는 채우지 않는다.
export function monthCells(
  year: number,
  monthIndex: number,
): (string | null)[] {
  const leading = new Date(year, monthIndex, 1).getDay()
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: lastDay }, (_, i) =>
      toDateKey(new Date(year, monthIndex, i + 1)),
    ),
  ]
}

// base가 속한 주(월요일 시작)의 7일
export function weekDates(base: Date): Date[] {
  const mondayOffset = (base.getDay() + 6) % 7
  return Array.from(
    { length: 7 },
    (_, i) =>
      new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate() - mondayOffset + i,
      ),
  )
}
