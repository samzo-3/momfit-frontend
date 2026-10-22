import {
  formatPeriodLabel,
  formatPeriodTitle,
  rangeForDays,
  todayKst,
} from './date-range'

describe('todayKst', () => {
  it('UTC 15시부터는 한국 시간으로 다음 날이다', () => {
    expect(todayKst(new Date('2026-10-21T14:59:00Z'))).toBe('2026-10-21')
    expect(todayKst(new Date('2026-10-21T15:00:00Z'))).toBe('2026-10-22')
  })
})

describe('rangeForDays', () => {
  it('오늘을 포함해 N일이다', () => {
    const now = new Date('2026-10-22T03:00:00Z')

    expect(rangeForDays(7, now)).toEqual({
      from: '2026-10-16',
      to: '2026-10-22',
    })
    expect(rangeForDays(30, now).from).toBe('2026-09-23')
  })

  it('달과 해를 넘겨도 맞다', () => {
    const now = new Date('2027-01-02T03:00:00Z')

    expect(rangeForDays(7, now).from).toBe('2026-12-27')
  })
})

describe('날짜 표기', () => {
  it('축에는 짧게, 툴팁에는 구간 종류에 맞게 쓴다', () => {
    expect(formatPeriodLabel('2026-10-05', 'day')).toBe('10/5')
    expect(formatPeriodLabel('2026-10-01', 'month')).toBe('10월')
    expect(formatPeriodTitle('2026-10-05', 'day')).toBe('2026년 10월 5일')
    expect(formatPeriodTitle('2026-10-05', 'week')).toBe('10/5 주')
    expect(formatPeriodTitle('2026-10-01', 'month')).toBe('2026년 10월')
  })
})
