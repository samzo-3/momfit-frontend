import {
  monthCells,
  monthRange,
  parseDateKey,
  toDateKey,
  weekDates,
} from './date'

describe('date', () => {
  it('toDateKey는 로컬 날짜를 0으로 채워 만든다', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('parseDateKey는 toDateKey와 서로 되돌린다', () => {
    expect(toDateKey(parseDateKey('2026-10-19'))).toBe('2026-10-19')
    expect(parseDateKey('2026-10-19').getDay()).toBe(1)
  })

  it('monthRange는 달의 첫날과 마지막 날을 준다', () => {
    expect(monthRange(2026, 9)).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    })
    expect(monthRange(2028, 1)).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    })
  })

  it('monthCells는 1일 요일만큼 앞을 비우고 일요일부터 센다', () => {
    // 2026-10-01은 목요일
    const cells = monthCells(2026, 9)
    expect(cells.slice(0, 5)).toEqual([null, null, null, null, '2026-10-01'])
    expect(cells).toHaveLength(4 + 31)
    expect(cells.at(-1)).toBe('2026-10-31')
  })

  it('monthCells는 일요일에 시작하는 달은 앞을 비우지 않는다', () => {
    // 2026-02-01은 일요일
    expect(monthCells(2026, 1)[0]).toBe('2026-02-01')
  })

  it('weekDates는 월요일부터 일요일까지 7일을 준다', () => {
    const days = weekDates(new Date(2026, 9, 21)).map(toDateKey)
    expect(days).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
  })

  it('weekDates는 일요일을 그 주의 마지막 날로 본다', () => {
    const days = weekDates(new Date(2026, 9, 25)).map(toDateKey)
    expect(days[0]).toBe('2026-10-19')
    expect(days[6]).toBe('2026-10-25')
  })

  it('weekDates는 월·연 경계를 넘어도 이어진다', () => {
    const days = weekDates(new Date(2026, 11, 31)).map(toDateKey)
    expect(days[0]).toBe('2026-12-28')
    expect(days[6]).toBe('2027-01-03')
  })
})
