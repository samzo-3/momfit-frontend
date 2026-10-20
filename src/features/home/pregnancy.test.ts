import { STAGES, stageFill, stageOf } from './pregnancy'

const [early, mid, late] = STAGES

describe('stageOf', () => {
  it('주차가 속한 구간을 돌려준다', () => {
    expect(stageOf(1)).toBe(early)
    expect(stageOf(13)).toBe(early)
    expect(stageOf(14)).toBe(mid)
    expect(stageOf(27)).toBe(mid)
    expect(stageOf(28)).toBe(late)
    expect(stageOf(40)).toBe(late)
  })

  it('40주를 넘겨도 후기이고, 모르거나 0 이하면 null이다', () => {
    expect(stageOf(42)).toBe(late)
    expect(stageOf(null)).toBeNull()
    expect(stageOf(0)).toBeNull()
  })
})

describe('stageFill', () => {
  it('지난 구간은 가득, 아직 안 온 구간은 비어 있다', () => {
    expect(stageFill(early, 28)).toBe(1)
    expect(stageFill(late, 10)).toBe(0)
  })

  it('현재 구간은 현재 주차까지 채운다', () => {
    expect(stageFill(late, 28)).toBeCloseTo(1 / 13)
    expect(stageFill(late, 40)).toBe(1)
  })

  it('주차를 모르면 모두 비어 있다', () => {
    expect(stageFill(early, null)).toBe(0)
  })
})
