import { describe, expect, it } from 'vitest'
import { SideKickExerciseTracker } from './side-kick-exercise'
import type { SideKickMotionEvent } from './side-kick-motion'

const metrics = {
  left_knee_angle_deg: 178,
  right_knee_angle_deg: 178,
  torso_lateral_lean_2d_deg: 0,
  shoulder_screen_tilt_deg: 0,
  pelvis_screen_tilt_deg: 0,
  left_ankle_relative_x_ratio: 0,
  right_ankle_relative_x_ratio: 0,
}

function rep(
  side: 'LEFT' | 'RIGHT',
  timestampMs: number,
): SideKickMotionEvent {
  return {
    type: 'REP_COMPLETED',
    side,
    peakMovement: 1,
    peakTimestampMs: timestampMs - 100,
    peakMetrics: metrics,
    timestampMs,
  }
}

describe('Side Kick 일반 운동 세트 집계', () => {
  it('왼쪽과 오른쪽을 완료하면 한 세트로 계산한다', () => {
    const tracker = new SideKickExerciseTracker()

    expect(tracker.update([rep('LEFT', 100)]).completedSets).toBe(0)

    const result = tracker.update([rep('RIGHT', 200)])

    expect(result.completedSets).toBe(1)
    expect(result.currentSet).toBe(2)
    expect(result.events).toEqual([
      {
        type: 'SET_COMPLETED',
        setNo: 1,
        timestampMs: 200,
      },
    ])
  })

  it('오른쪽부터 시작하면 세트를 인정하지 않는다', () => {
    const tracker = new SideKickExerciseTracker()

    const result = tracker.update([rep('RIGHT', 100)])

    expect(result.completedSets).toBe(0)
    expect(result.phase).toBe('WAIT_LEFT')
  })

  it('왼쪽 동작만 여러 번 해도 세트가 증가하지 않는다', () => {
    const tracker = new SideKickExerciseTracker()

    tracker.update([rep('LEFT', 100)])
    tracker.update([rep('LEFT', 200)])

    expect(tracker.getResult().completedSets).toBe(0)
    expect(tracker.getResult().phase).toBe('WAIT_RIGHT')
  })

  it('인식 실패 시 미완성 세트만 초기화한다', () => {
    const tracker = new SideKickExerciseTracker()

    tracker.update([rep('LEFT', 100), rep('RIGHT', 200)])
    tracker.update([rep('LEFT', 300)])

    const result = tracker.update([
      {
        type: 'MOTION_PAUSED',
        reason: 'FEATURE_UNAVAILABLE',
      },
    ])

    expect(result.completedSets).toBe(1)
    expect(result.phase).toBe('WAIT_LEFT')
    expect(result.events[0]).toEqual({
      type: 'PARTIAL_SET_CANCELLED',
      reason: 'TRACKING_LOST',
    })
  })

  it('최대 10세트까지만 인정한다', () => {
    const tracker = new SideKickExerciseTracker()

    for (let i = 0; i < 12; i++) {
      tracker.update([
        rep('LEFT', i * 200 + 100),
        rep('RIGHT', i * 200 + 200),
      ])
    }

    const result = tracker.getResult()

    expect(result.completedSets).toBe(10)
    expect(result.currentSet).toBe(10)
    expect(result.phase).toBe('COMPLETED')
  })

  it('초기화하면 새로운 운동을 시작할 수 있다', () => {
    const tracker = new SideKickExerciseTracker()

    tracker.update([rep('LEFT', 100), rep('RIGHT', 200)])
    tracker.reset()

    expect(tracker.getResult().completedSets).toBe(0)
    expect(tracker.getResult().currentSet).toBe(1)
  })

  it('동일 입력 배열의 좌우 순서를 유지하여 처리한다', () => {
    const tracker = new SideKickExerciseTracker()

    const result = tracker.update([
      rep('LEFT', 100),
      rep('RIGHT', 200),
    ])

    expect(result.completedSets).toBe(1)
  })

  it('유효하지 않은 목표 세트 수를 거부한다', () => {
    expect(() => new SideKickExerciseTracker(0)).toThrow(
      'INVALID_TARGET_SETS',
    )
  })
})
