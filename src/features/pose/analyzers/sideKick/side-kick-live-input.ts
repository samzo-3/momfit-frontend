import type { PoseFrame, PoseLandmarkPoint } from '../../mediapipe/usePoseLandmarker'
import { extractPoseFeaturesV2 } from '../common/pose-feature-extractor-v2'
import type { LiftInput, SideKickSide } from './side-kick-step-evaluator'

const REQUIRED = [11, 12, 23, 24] as const

function valid(point: PoseLandmarkPoint | undefined): point is PoseLandmarkPoint {
  return !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    (point.visibility ?? 0) >= 0.5 &&
    (point.presence ?? 0) >= 0.5
}

function distance(a: PoseLandmarkPoint, b: PoseLandmarkPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function angle(a: PoseLandmarkPoint, b: PoseLandmarkPoint): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
}

function wrap(degrees: number): number {
  return ((degrees + 180) % 360 + 360) % 360 - 180
}

export function createSideKickLiftInput(
  frame: PoseFrame,
  side: SideKickSide,
): LiftInput {
  const extracted = extractPoseFeaturesV2(frame)
  const thigh = extracted.features[`${side}_thigh_lateral_angle_deg`]

  let relativeTilt: number | null = null
  let torsoAsymmetry: number | null = null

  const points = frame.landmarks

  if (REQUIRED.every((index) => valid(points[index]))) {
    const ls = points[11]
    const rs = points[12]
    const lh = points[23]
    const rh = points[24]

    const shoulderWidth = distance(ls, rs)

    if (shoulderWidth >= 1e-6) {
      relativeTilt = wrap(angle(ls, rs) - angle(lh, rh))

      torsoAsymmetry =
        (distance(ls, lh) - distance(rs, rh)) / shoulderWidth
    }
  }

  return {
    timestampMs: frame.timestampMs,
    thighLateralDeg:
      typeof thigh === 'number' && Number.isFinite(thigh) ? thigh : null,
    shoulderPelvisRelativeTiltDeg: relativeTilt,
    torsoLengthAsymmetryRatio: torsoAsymmetry,
  }
}
