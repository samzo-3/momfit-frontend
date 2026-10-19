import { exerciseLevelLabel } from './exercise-levels'
import { formatDate } from './format'

describe('formatDate', () => {
  it('YYYY-MM-DD를 한글 날짜로 바꾼다', () => {
    expect(formatDate('2027-01-11')).toBe('2027년 1월 11일')
    expect(formatDate('2026-12-24')).toBe('2026년 12월 24일')
  })

  it('값이 없으면 -를 보여준다', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate('')).toBe('-')
  })

  it('형식이 다르면 원래 값을 그대로 보여준다', () => {
    expect(formatDate('내일')).toBe('내일')
  })
})

describe('exerciseLevelLabel', () => {
  it('서버 값을 하/중/상으로 바꾼다', () => {
    expect(exerciseLevelLabel('low')).toBe('하')
    expect(exerciseLevelLabel('medium')).toBe('중')
    expect(exerciseLevelLabel('high')).toBe('상')
  })

  it('값이 없으면 -를 보여준다', () => {
    expect(exerciseLevelLabel(null)).toBe('-')
  })
})
