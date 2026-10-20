import { formatDateTime } from './format'
import { WITHDRAWAL_GRACE_DAYS } from './withdrawal'

describe('탈퇴 유예', () => {
  it('안내 문구의 유예 기간은 서버 기본값과 같은 30일이다', () => {
    expect(WITHDRAWAL_GRACE_DAYS).toBe(30)
  })
})

describe('formatDateTime', () => {
  it('ISO 시각을 한국어 날짜로 바꾼다', () => {
    expect(formatDateTime('2026-11-19T12:00:00Z')).toBe('2026년 11월 19일')
  })

  it('해석할 수 없는 값은 그대로 돌려준다', () => {
    expect(formatDateTime('아님')).toBe('아님')
  })
})
