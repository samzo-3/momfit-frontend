import { describe, expect, it, vi } from 'vitest'
import type { PoseFrame } from '../../mediapipe/usePoseLandmarker'

const BASELINE = { left: -6.879, right: -4.444 }

type Sample = {
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
import { SideKickVoiceBridge } from '../../voice/side-kick-voice-bridge'

function frame(timestampMs: number, sample?: Sample): TestFrame {
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 1,
    presence: 1,
  }))

  return { timestampMs, landmarks, worldLandmarks: landmarks, sample }
}

function ready(runtime: SideKickStudyRuntime) {
  for (let index = 0; index < 8; index++) {
    runtime.update(frame(index * 70), { readyPoseValid: true })
  }
}

describe('SideKick Runtime → Voice integration', () => {
  it('실제 STEP 2 criterionFailures가 2초 뒤 교정 음성으로 전달되고 PASS 전환이 우선한다', () => {
    const runtime = new SideKickStudyRuntime()
    const bridge = new SideKickVoiceBridge()
    ready(runtime)

    const start = runtime.update(
      frame(560, { legDelta: 30, bend: 5, asym: 0.1 }),
    )
    expect(
      bridge.update(560, start).map((decision) => decision.eventCode),
    ).toEqual(['SK_LEFT_LIFT_START'])

    let emitted: string[] = []
    let latestSnapshot = start
    for (let timestampMs = 630; timestampMs <= 2800; timestampMs += 70) {
      const snapshot = runtime.update(
        frame(timestampMs, { legDelta: 30, bend: 5, asym: 0.1 }),
      )
      latestSnapshot = snapshot
      emitted = emitted.concat(
        bridge
          .update(timestampMs, snapshot)
          .map((decision) => decision.eventCode),
      )
    }

    expect(latestSnapshot.lift).toMatchObject({
      measurementStatus: 'VALID',
      criterionFailures: [
        'TORSO_BEND_INSUFFICIENT',
        'TORSO_ASYMMETRY_INSUFFICIENT',
      ],
    })
    expect(emitted).toContain('SK_TORSO_BEND_MORE')

    for (let timestampMs = 2870; timestampMs <= 5600; timestampMs += 70) {
      const snapshot = runtime.update(
        frame(timestampMs, { legDelta: 30, bend: 34, asym: 0.56 }),
      )
      emitted = emitted.concat(
        bridge
          .update(timestampMs, snapshot)
          .map((decision) => decision.eventCode),
      )
      if (snapshot.flow.step === 3) break
    }

    expect(runtime.getSnapshot().flow.step).toBe(3)
    expect(emitted.at(-1)).toBe('SK_LEFT_RETURN')
  })

  it('실제 INVALID lift snapshot은 교정 음성을 만들지 않는다', () => {
    const runtime = new SideKickStudyRuntime()
    const bridge = new SideKickVoiceBridge()
    ready(runtime)
    bridge.update(560, runtime.update(frame(560)))

    const emitted: string[] = []
    let latestSnapshot = runtime.update(frame(630))
    emitted.push(
      ...bridge
        .update(630, latestSnapshot)
        .map((decision) => decision.eventCode),
    )
    for (let timestampMs = 700; timestampMs <= 2800; timestampMs += 70) {
      const snapshot = runtime.update(frame(timestampMs))
      latestSnapshot = snapshot
      emitted.push(
        ...bridge
          .update(timestampMs, snapshot)
          .map((decision) => decision.eventCode),
      )
    }

    expect(latestSnapshot.lift).toMatchObject({
      measurementStatus: 'INVALID',
      criterionFailures: [],
    })
    expect(emitted).not.toContain('SK_LEG_LIFT_MORE')
    expect(emitted).not.toContain('SK_TORSO_BEND_MORE')
    expect(emitted).not.toContain('SK_TORSO_ASYMMETRY_MORE')
  })
})
