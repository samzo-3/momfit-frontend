import { describe, expect, it } from 'vitest'
import type { SideKickFeatureResult } from './side-kick-features'
import { SideKickMotionTracker, type FrontStatus } from './side-kick-motion'

function features(left: number, right: number): SideKickFeatureResult {
  return {
    valid: true,
    reason: null,
    metrics: {
      left_knee_angle_deg: 178,
      right_knee_angle_deg: 177,
      torso_lateral_lean_2d_deg: 0,
      shoulder_screen_tilt_deg: 0,
      pelvis_screen_tilt_deg: 0,
      left_ankle_relative_x_ratio: left,
      right_ankle_relative_x_ratio: right,
    },
  }
}

function frame(
  tracker: SideKickMotionTracker,
  ms: number,
  left: number,
  right: number,
  frontStatus: FrontStatus = 'FRONT_OK',
) {
  return tracker.update({
    timestampMs: ms,
    frontStatus,
    features: features(left, right),
  })
}

describe('Side Kick 정면 반복 감지', () => {
  it('오른쪽 다리를 들었다가 복귀하면 1회 기록한다', () => {
    const tracker = new SideKickMotionTracker()

    frame(tracker, 0, 0.04, 0.04)
    frame(tracker, 30, 0.04, 0.4)
    frame(tracker, 60, 0.04, 0.85)
    frame(tracker, 90, 0.04, 1.2)
    frame(tracker, 120, 0.04, 0.9)
    frame(tracker, 150, 0.04, 0.3)
    frame(tracker, 180, 0.04, 0.07)

    const result = frame(tracker, 250, 0.04, 0.05)

    expect(result.completedReps).toBe(1)
    expect(result.rightReps).toBe(1)
    expect(result.leftReps).toBe(0)
    expect(result.events).toEqual([
      {
        type: 'REP_COMPLETED',
        side: 'RIGHT',
        peakMovement: 1.2,
        timestampMs: 250,
      },
    ])
  })

  it('왼쪽 반복도 별도로 집계한다', () => {
    const tracker = new SideKickMotionTracker()

    frame(tracker, 0, 0.02, 0.02)
    frame(tracker, 30, -0.4, 0.02)
    frame(tracker, 60, -0.9, 0.02)
    frame(tracker, 90, -1.1, 0.02)
    frame(tracker, 120, -0.8, 0.02)
    frame(tracker, 150, -0.05, 0.02)

    const result = frame(tracker, 220, -0.04, 0.02)

    expect(result.completedReps).toBe(1)
    expect(result.leftReps).toBe(1)
    expect(result.rightReps).toBe(0)
  })

  it('복귀 후 정지 중에는 중복 카운트하지 않는다', () => {
    const tracker = new SideKickMotionTracker()

    frame(tracker, 0, 0, 0)
    frame(tracker, 30, 0, 0.4)
    frame(tracker, 60, 0, 0.9)
    frame(tracker, 90, 0, 0.7)
    frame(tracker, 120, 0, 0.05)
    frame(tracker, 190, 0, 0.05)

    const result = frame(tracker, 400, 0, 0.05)

    expect(result.completedReps).toBe(1)
    expect(result.events).toEqual([])
  })

  it('작은 움직임은 반복으로 기록하지 않는다', () => {
    const tracker = new SideKickMotionTracker()

    frame(tracker, 0, 0, 0)
    frame(tracker, 30, 0, 0.4)
    frame(tracker, 60, 0, 0.5)
    frame(tracker, 90, 0, 0.3)
    frame(tracker, 120, 0, 0.05)

    const result = frame(tracker, 220, 0, 0.05)

    expect(result.completedReps).toBe(0)
  })

  it('정면 이탈 시 진행 중인 반복을 취소한다', () => {
    const tracker = new SideKickMotionTracker()

    frame(tracker, 0, 0, 0)
    frame(tracker, 30, 0, 0.4)
    frame(tracker, 60, 0, 1.0)

    const paused = frame(tracker, 90, 0, 1.0, 'NOT_FRONT')

    expect(paused.phase).toBe('READY')
    expect(paused.events).toEqual([
      { type: 'MOTION_PAUSED', reason: 'FRONT_UNAVAILABLE' },
    ])

    frame(tracker, 120, 0, 0.05)
    const result = frame(tracker, 180, 0, 0.05)

    expect(result.completedReps).toBe(0)
  })

  it('인식이 실패하면 진행 중인 반복을 취소한다', () => {
    const tracker = new SideKickMotionTracker()

    frame(tracker, 0, 0, 0)
    frame(tracker, 30, 0, 0.4)

    const result = tracker.update({
      timestampMs: 60,
      frontStatus: 'FRONT_OK',
      features: {
        valid: false,
        metrics: null,
        reason: 'LOW_CONFIDENCE',
      },
    })

    expect(result.phase).toBe('READY')
    expect(result.events).toEqual([
      { type: 'MOTION_PAUSED', reason: 'FEATURE_UNAVAILABLE' },
    ])
  })

  it('동일한 타임스탬프를 중복 처리하지 않는다', () => {
    const tracker = new SideKickMotionTracker()

    frame(tracker, 0, 0, 0)
    const first = frame(tracker, 30, 0, 0.4)
    const duplicate = frame(tracker, 30, 0, 0.8)

    expect(duplicate.phase).toBe(first.phase)
    expect(duplicate.peakMovement).toBe(first.peakMovement)
  })

  it('긴 프레임 간격 이후 진행 중인 반복을 초기화한다', () => {
    const tracker = new SideKickMotionTracker()

    frame(tracker, 0, 0, 0)
    frame(tracker, 30, 0, 0.4)
    frame(tracker, 60, 0, 1.0)

    const result = frame(tracker, 1000, 0, 0.05)

    expect(result.phase).toBe('READY')
    expect(result.completedReps).toBe(0)
  })

  it('READY를 관측하기 전에는 반복을 시작하지 않는다', () => {
    const tracker = new SideKickMotionTracker()

    frame(tracker, 0, 0, 0.8)
    frame(tracker, 30, 0, 1.0)
    frame(tracker, 60, 0, 0.5)

    const result = frame(tracker, 90, 0, 0.04)

    expect(result.completedReps).toBe(0)
  })
})
