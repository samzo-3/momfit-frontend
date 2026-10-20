import { describe, expect, it } from 'vitest'
import {
  extractSideKickFeatures,
  type SideKickInput,
} from './side-kick-features'

function makeInput(): SideKickInput {
  return {
    width: 100,
    height: 100,
    trackingStatus: 'TRACKING',
    poseStatus: 'POSE_VALID',
    landmarks: {
      LEFT_SHOULDER: { x: 0.4, y: 0.2, visibility: 1, presence: 1 },
      RIGHT_SHOULDER: { x: 0.6, y: 0.2, visibility: 1, presence: 1 },
      LEFT_HIP: { x: 0.4, y: 0.5, visibility: 1, presence: 1 },
      RIGHT_HIP: { x: 0.6, y: 0.5, visibility: 1, presence: 1 },
      LEFT_KNEE: { x: 0.4, y: 0.7, visibility: 1, presence: 1 },
      RIGHT_KNEE: { x: 0.6, y: 0.7, visibility: 1, presence: 1 },
      LEFT_ANKLE: { x: 0.2, y: 0.9, visibility: 1, presence: 1 },
      RIGHT_ANKLE: { x: 0.8, y: 0.9, visibility: 1, presence: 1 },
    },
  }
}

describe('Side Kick 특징값 추출', () => {
  it('무릎 각도와 발목 상대 위치를 계산한다', () => {
    const result = extractSideKickFeatures(makeInput())

    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.metrics.left_knee_angle_deg).toBeCloseTo(135, 3)
    expect(result.metrics.right_knee_angle_deg).toBeCloseTo(135, 3)
    expect(result.metrics.torso_lateral_lean_2d_deg).toBeCloseTo(0, 3)

    expect(result.metrics.left_ankle_relative_x_ratio).toBeCloseTo(-0.6667, 3)
    expect(result.metrics.right_ankle_relative_x_ratio).toBeCloseTo(0.6667, 3)
  })

  it('추적 대상이 없으면 자세를 판정하지 않는다', () => {
    const input = makeInput()
    input.trackingStatus = 'TARGET_LOST'

    const result = extractSideKickFeatures(input)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('TRACKING_UNAVAILABLE')
  })

  it('필수 랜드마크가 누락되면 계산하지 않는다', () => {
    const input = makeInput()
    delete input.landmarks.LEFT_KNEE

    const result = extractSideKickFeatures(input)
    expect(result.reason).toBe('LANDMARK_MISSING')
  })

  it('랜드마크 가시성이 낮으면 계산하지 않는다', () => {
    const input = makeInput()
    input.landmarks.LEFT_KNEE = {
      x: 0.4,
      y: 0.7,
      visibility: 0.2,
      presence: 1,
    }

    const result = extractSideKickFeatures(input)
    expect(result.reason).toBe('LOW_CONFIDENCE')
  })

  it('잘못된 프레임 크기는 거부한다', () => {
    const input = makeInput()
    input.width = 0

    const result = extractSideKickFeatures(input)
    expect(result.reason).toBe('INVALID_FRAME')
  })

  it('같은 좌표로 무릎 벡터를 만들 수 없으면 거부한다', () => {
    const input = makeInput()
    input.landmarks.LEFT_KNEE = {
      x: 0.4,
      y: 0.5,
      visibility: 1,
      presence: 1,
    }

    const result = extractSideKickFeatures(input)
    expect(result.reason).toBe('DEGENERATE_GEOMETRY')
  })
})

describe('Side Kick 어깨·골반 기울기', () => {
  it('수평인 어깨와 골반은 기울기가 0도다', () => {
    const result = extractSideKickFeatures(makeInput())
    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.metrics.shoulder_screen_tilt_deg).toBeCloseTo(0, 4)
    expect(result.metrics.pelvis_screen_tilt_deg).toBeCloseTo(0, 4)
  })

  it('오른쪽 어깨가 화면 아래쪽에 있으면 양수 기울기다', () => {
    const input = makeInput()
    input.landmarks.RIGHT_SHOULDER = {
      x: 0.6,
      y: 0.3,
      visibility: 1,
      presence: 1,
    }

    const result = extractSideKickFeatures(input)
    expect(result.valid).toBe(true)
    if (!result.valid) return

    expect(result.metrics.shoulder_screen_tilt_deg).toBeCloseTo(26.5651, 3)
  })
})
