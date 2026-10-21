import { describe, expect, it } from 'vitest'
import { SideKickStudyTracker } from './side-kick-study'

const ok = (score = 85) => ({
  status: 'EVALUATED' as const,
  score,
  eventCode: null,
})

const bad = (score = 65) => ({
  status: 'EVALUATED' as const,
  score,
  eventCode: 'LEG_POSITION_ADJUST',
})

describe('Side Kick STUDY - 2초 유지와 지연 코칭', () => {
  it('80점 이상 2초 유지 시 PASS', () => {
    const tracker = new SideKickStudyTracker()

    let result = tracker.update(0, ok())

    for (let t = 100; t <= 2000; t += 100) {
      result = tracker.update(t, ok())
    }

    expect(result.stepNo).toBe(2)
    expect(result.records[0].status).toBe('PASS')
    expect(result.records[0].stepScore).toBe(85)
  })

  it('기준 미달 1.5초 전에는 코칭하지 않는다', () => {
    const tracker = new SideKickStudyTracker()

    let result = tracker.update(0, bad())

    for (let t = 100; t < 1500; t += 100) {
      result = tracker.update(t, bad())
    }

    expect(result.feedbackCount).toBe(0)
    expect(result.events).toEqual([])
  })

  it('기준 미달 1.5초 유지 시 코칭 요청', () => {
    const tracker = new SideKickStudyTracker()

    let result = tracker.update(0, bad())

    for (let t = 100; t <= 1500; t += 100) {
      result = tracker.update(t, bad())
    }

    expect(result.feedbackCount).toBe(1)
    expect(result.events[0].type).toBe('VOICE_CUE')
  })

  it('자세를 고치면 코칭 대기 시간이 초기화된다', () => {
    const tracker = new SideKickStudyTracker()

    tracker.update(0, bad())
    tracker.update(100, bad())
    tracker.update(200, ok())

    const result = tracker.update(300, bad())

    expect(result.feedbackCount).toBe(0)
  })

  it('인식 불량은 코칭 횟수에 포함되지 않는다', () => {
    const tracker = new SideKickStudyTracker()

    tracker.update(0, bad())
    const result = tracker.update(100, {
      status: 'UNAVAILABLE',
      reason: 'POSE',
    })

    expect(result.feedbackCount).toBe(0)
  })

  it('5회 코칭 요청 후 NON_PASS와 최고점을 기록한다', () => {
    const tracker = new SideKickStudyTracker()

    let result = tracker.update(0, bad(60))

    for (let t = 100; t <= 15000; t += 100) {
      result = tracker.update(t, bad(60))
      if (result.records.length > 0) break
    }

    expect(result.stepNo).toBe(2)
    expect(result.records[0].status).toBe('NON_PASS')
    expect(result.records[0].feedbackCount).toBe(5)
    expect(result.records[0].stepScore).toBe(60)
  })

  it('5개 STEP PASS 시 완료', () => {
    const tracker = new SideKickStudyTracker()
    let result = tracker.update(0, ok())

    for (let step = 0; step < 5; step++) {
      const start = step * 2500

      for (let t = start + 100; t <= start + 2100; t += 100) {
        result = tracker.update(t, ok())
      }
    }

    expect(result.status).toBe('COMPLETED')
    expect(result.records).toHaveLength(5)
    expect(result.records.every((r) => r.status === 'PASS')).toBe(true)
  })
})
