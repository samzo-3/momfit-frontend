import { daysUntil, formatDday } from './due-date'

describe('daysUntil', () => {
  const now = new Date(2026, 9, 20, 15, 30)

  it('날짜만 비교하므로 시각과 상관없이 같은 값이다', () => {
    expect(daysUntil('2026-10-21', new Date(2026, 9, 20, 0, 0))).toBe(1)
    expect(daysUntil('2026-10-21', new Date(2026, 9, 20, 23, 59))).toBe(1)
  })

  it('오늘이면 0, 지났으면 음수다', () => {
    expect(daysUntil('2026-10-20', now)).toBe(0)
    expect(daysUntil('2026-10-17', now)).toBe(-3)
  })

  it('달과 해를 넘겨도 센다', () => {
    expect(daysUntil('2027-01-11', now)).toBe(83)
  })
})

describe('formatDday', () => {
  it('남았으면 D-N, 당일이면 D-Day, 지났으면 D+N', () => {
    expect(formatDday(84)).toBe('D-84')
    expect(formatDday(0)).toBe('D-Day')
    expect(formatDday(-3)).toBe('D+3')
  })
})
