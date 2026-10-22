import { describe, expect, it, vi } from 'vitest'
import type { PoseFrame } from '../../mediapipe/usePoseLandmarker'

const BASELINE = { left: -6.879, right: -4.444 }

type Sample = {
  side: 'left' | 'right'
  legDelta: number
  bend: number
  asym: number
}

type TestFrame = PoseFrame & { sample?: Sample }

vi.mock('../common/pose-feature-extractor-v2', () => ({
  extractPoseFeaturesV2: () => ({
    features: {
      left_thigh_lateral_angle_deg: BASELINE.left,
      right_thigh_lateral_angle_deg: BASELINE.right,
    },
  }),
}))

vi.mock('./side-kick-live-input', () => ({
  createSideKickLiftInput: (frame: TestFrame, side: 'left' | 'right') => {
    const sample = frame.sample
    const orientation = side === 'left' ? 1 : -1
    return {
      timestampMs: frame.timestampMs,
      thighLateralDeg: sample ? BASELINE[side] + sample.legDelta : null,
      shoulderPelvisRelativeTiltDeg: sample ? orientation * sample.bend : null,
      torsoLengthAsymmetryRatio: sample ? -orientation * sample.asym : null,
    }
  },
}))

import { SideKickStudyRuntime } from './side-kick-study-runtime'

function frame(t: number, sample?: Sample): TestFrame {
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 1,
    presence: 1,
  }))

  return {
    timestampMs: t,
    landmarks,
    worldLandmarks: landmarks,
    sample,
  }
}

function ready(runtime: SideKickStudyRuntime, start = 0) {
  for (let i = 0; i < 8; i++) {
    runtime.update(frame(start + i * 70), { readyPoseValid: true })
  }
}

function lift(
  runtime: SideKickStudyRuntime,
  side: 'left' | 'right',
  start: number,
  quality: 'correct' | 'leg-only' = 'correct',
) {
  let result = runtime.getSnapshot()

  for (let i = 0; i < 50; i++) {
    result = runtime.update(
      frame(start + i * 70, {
        side,
        legDelta: 30,
        bend: quality === 'correct' ? 34 : 5,
        asym: quality === 'correct' ? 0.56 : 0.1,
      }),
    )

    if (result.flow.step !== (side === 'left' ? 2 : 4)) {
      return result
    }
  }

  return result
}

function back(
  runtime: SideKickStudyRuntime,
  side: 'left' | 'right',
  start: number,
) {
  runtime.update(
    frame(start, {
      side,
      legDelta: 0,
      bend: 0,
      asym: 0,
    }),
  )

  return runtime.update(
    frame(start + 70, {
      side,
      legDelta: 0,
      bend: 0,
      asym: 0,
    }),
  )
}

describe('SideKickStudyRuntime', () => {
  it('READY 샘플 부족 시 STEP 1을 유지한다', () => {
    const runtime = new SideKickStudyRuntime()

    for (let i = 0; i < 7; i++) {
      runtime.update(frame(i * 70), { readyPoseValid: true })
    }

    expect(runtime.getSnapshot().flow.step).toBe(1)

    runtime.update(frame(490), { readyPoseValid: true })

    expect(runtime.getSnapshot().flow.step).toBe(2)
    expect(runtime.getSnapshot().baseline?.sampleCount).toBe(8)
  })

  it('STEP 2는 잠깐 기준을 통과해도 PASS하지 않는다', () => {
    const runtime = new SideKickStudyRuntime()
    ready(runtime)

    for (let i = 0; i < 12; i++) {
      runtime.update(
        frame(600 + i * 70, {
          side: 'left',
          legDelta: 30,
          bend: 34,
          asym: 0.56,
        }),
      )
    }

    expect(runtime.getSnapshot().flow.step).toBe(2)
  })

  it('STEP 1부터 5까지 실제 평가기를 거쳐 최종 PASS한다', () => {
    const runtime = new SideKickStudyRuntime()
    ready(runtime)

    const left = lift(runtime, 'left', 600)
    expect(left.flow.step).toBe(3)
    expect(left.flow.records[1].outcome).toBe('PASS')

    const returningLeft = back(runtime, 'left', 4200)
    expect(returningLeft.flow.step).toBe(4)

    const right = lift(runtime, 'right', 4400)
    expect(right.flow.step).toBe(5)
    expect(right.flow.records[3].outcome).toBe('PASS')

    const final = back(runtime, 'right', 8000)
    expect(final.flow.completed).toBe(true)
    expect(final.flow.finalResult).toBe('PASS')
    expect(final.flow.records).toHaveLength(5)
  })

  it('STEP 2가 NON_PASS라면 최종 결과도 NON_PASS다', () => {
    const runtime = new SideKickStudyRuntime()
    ready(runtime)

    lift(runtime, 'left', 600, 'leg-only')

    expect(runtime.getSnapshot().flow.step).toBe(2)

    runtime.update(
      frame(21000, {
        side: 'left',
        legDelta: 30,
        bend: 5,
        asym: 0.1,
      }),
    )

    expect(runtime.getSnapshot().flow.step).toBe(3)
    back(runtime, 'left', 21100)
    expect(runtime.getSnapshot().flow.step).toBe(4)

    lift(runtime, 'right', 21300)
    back(runtime, 'right', 25000)

    expect(runtime.getSnapshot().flow.completed).toBe(true)
    expect(runtime.getSnapshot().flow.finalResult).toBe('NON_PASS')
  })

  it('복귀 전에 다음 상승 STEP을 시작하지 않는다', () => {
    const runtime = new SideKickStudyRuntime()
    ready(runtime)
    lift(runtime, 'left', 600)

    for (let i = 0; i < 10; i++) {
      runtime.update(
        frame(4200 + i * 70, {
          side: 'left',
          legDelta: 30,
          bend: 34,
          asym: 0.56,
        }),
      )
    }

    expect(runtime.getSnapshot().flow.step).toBe(3)
  })

  it('재시작하면 STEP과 READY 기준선을 초기화한다', () => {
    const runtime = new SideKickStudyRuntime()
    ready(runtime)
    runtime.reset()

    expect(runtime.getSnapshot().flow.step).toBe(1)
    expect(runtime.getSnapshot().baseline).toBeNull()
    expect(runtime.getSnapshot().readySampleCount).toBe(0)
  })
})
