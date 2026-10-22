import { describe, expect, it } from 'vitest'
import type {
  PoseFrame,
  PoseLandmarkPoint,
} from '../../mediapipe/usePoseLandmarker'
import { SideKickReadyCalibrator } from './side-kick-ready-baseline'

function makeFrame(timestampMs: number): PoseFrame {
  const points: PoseLandmarkPoint[] = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 1,
    presence: 1,
  }))

  points[11] = { x: 0.4, y: 0.2, z: 0, visibility: 1, presence: 1 }
  points[12] = { x: 0.6, y: 0.2, z: 0, visibility: 1, presence: 1 }
  points[23] = { x: 0.4, y: 0.5, z: 0, visibility: 1, presence: 1 }
  points[24] = { x: 0.6, y: 0.5, z: 0, visibility: 1, presence: 1 }
  points[25] = { x: 0.35, y: 0.8, z: 0, visibility: 1, presence: 1 }
  points[26] = { x: 0.65, y: 0.8, z: 0, visibility: 1, presence: 1 }

  return {
    timestampMs,
    landmarks: points.map((point) => ({ ...point })),
    worldLandmarks: points,
  }
}

describe('SideKickReadyCalibrator', () => {
  it('유효한 3D 프레임 8개를 모으면 기준선을 만든다', () => {
    const calibrator = new SideKickReadyCalibrator()

    for (let i = 0; i < 8; i++) {
      expect(calibrator.add(makeFrame(i * 100), true)).toBe(true)
    }

    const baseline = calibrator.getBaseline()

    expect(baseline).not.toBeNull()
    expect(baseline?.sampleCount).toBe(8)
    expect(Number.isFinite(baseline?.left)).toBe(true)
    expect(Number.isFinite(baseline?.right)).toBe(true)
  })

  it('준비 자세가 유효하지 않으면 수집하지 않는다', () => {
    const calibrator = new SideKickReadyCalibrator()

    expect(calibrator.add(makeFrame(0), false)).toBe(false)
    expect(calibrator.sampleCount).toBe(0)
    expect(calibrator.getBaseline()).toBeNull()
  })

  it('3D 랜드마크가 없으면 수집하지 않는다', () => {
    const calibrator = new SideKickReadyCalibrator()
    const frame = makeFrame(0)

    delete frame.worldLandmarks

    expect(calibrator.add(frame, true)).toBe(false)
    expect(calibrator.ready).toBe(false)
  })

  it('8개 미만에서는 기준선을 확정하지 않는다', () => {
    const calibrator = new SideKickReadyCalibrator()

    for (let i = 0; i < 7; i++) {
      calibrator.add(makeFrame(i * 100), true)
    }

    expect(calibrator.getBaseline()).toBeNull()
  })

  it('수집 개수를 최대 30개로 제한한다', () => {
    const calibrator = new SideKickReadyCalibrator()

    for (let i = 0; i < 50; i++) {
      calibrator.add(makeFrame(i * 100), true)
    }

    expect(calibrator.sampleCount).toBe(30)
  })

  it('재시작하면 기준선을 초기화한다', () => {
    const calibrator = new SideKickReadyCalibrator()

    for (let i = 0; i < 8; i++) {
      calibrator.add(makeFrame(i * 100), true)
    }

    calibrator.reset()

    expect(calibrator.ready).toBe(false)
    expect(calibrator.getBaseline()).toBeNull()
  })
})
