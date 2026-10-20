/**
 * Side Kick 2D 특징값 계산.
 *
 * - 전체 프레임 기준 정규화된 MediaPipe 랜드마크 사용
 * - 좌우 반전되지 않은 원본 좌표 기준
 * - 실제 영상의 width / height를 사용해 픽셀 좌표로 변환
 * - 자세 점수와 임상적 안전성은 판단하지 않음
 */

export type SideKickLandmarkName =
  | 'LEFT_SHOULDER'
  | 'RIGHT_SHOULDER'
  | 'LEFT_HIP'
  | 'RIGHT_HIP'
  | 'LEFT_KNEE'
  | 'RIGHT_KNEE'
  | 'LEFT_ANKLE'
  | 'RIGHT_ANKLE'

export type Landmark2D = {
  x: number
  y: number
  visibility?: number
  presence?: number
}

export type SideKickInput = {
  width: number
  height: number
  trackingStatus: 'TRACKING' | 'TARGET_LOST' | 'TARGET_UNCERTAIN'
  poseStatus: 'POSE_VALID' | 'POSE_INVALID'
  landmarks: Partial<Record<SideKickLandmarkName, Landmark2D>>
}

export type SideKickMetrics = {
  left_knee_angle_deg: number
  right_knee_angle_deg: number
  torso_lateral_lean_2d_deg: number
  shoulder_screen_tilt_deg: number
  pelvis_screen_tilt_deg: number
  left_ankle_relative_x_ratio: number
  right_ankle_relative_x_ratio: number
}

export type FeatureFailureReason =
  | 'TRACKING_UNAVAILABLE'
  | 'POSE_INVALID'
  | 'LANDMARK_MISSING'
  | 'LOW_CONFIDENCE'
  | 'INVALID_FRAME'
  | 'DEGENERATE_GEOMETRY'

export type SideKickFeatureResult =
  | { valid: true; metrics: SideKickMetrics; reason: null }
  | { valid: false; metrics: null; reason: FeatureFailureReason }

type Point = { x: number; y: number }

const NEEDED: readonly SideKickLandmarkName[] = [
  'LEFT_SHOULDER',
  'RIGHT_SHOULDER',
  'LEFT_HIP',
  'RIGHT_HIP',
  'LEFT_KNEE',
  'RIGHT_KNEE',
  'LEFT_ANKLE',
  'RIGHT_ANKLE',
]

function angle(a: Point, b: Point, c: Point): number | null {
  const ux = a.x - b.x
  const uy = a.y - b.y
  const vx = c.x - b.x
  const vy = c.y - b.y

  const nu = Math.hypot(ux, uy)
  const nv = Math.hypot(vx, vy)

  if (nu < 1e-6 || nv < 1e-6) return null

  const cosine = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (nu * nv)))

  return (Math.acos(cosine) * 180) / Math.PI
}

function horizontalTilt(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, Math.abs(b.x - a.x)) * 180) / Math.PI
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000
}

export function extractSideKickFeatures(
  input: SideKickInput,
  minConfidence = 0.5,
): SideKickFeatureResult {
  const invalid = (reason: FeatureFailureReason): SideKickFeatureResult => ({
    valid: false,
    metrics: null,
    reason,
  })

  if (input.trackingStatus !== 'TRACKING') {
    return invalid('TRACKING_UNAVAILABLE')
  }

  if (input.poseStatus !== 'POSE_VALID') {
    return invalid('POSE_INVALID')
  }

  if (
    !Number.isFinite(input.width) ||
    !Number.isFinite(input.height) ||
    input.width <= 0 ||
    input.height <= 0
  ) {
    return invalid('INVALID_FRAME')
  }

  if (
    !Number.isFinite(minConfidence) ||
    minConfidence < 0 ||
    minConfidence > 1
  ) {
    return invalid('LOW_CONFIDENCE')
  }

  for (const name of NEEDED) {
    const lm = input.landmarks[name]
    if (!lm) return invalid('LANDMARK_MISSING')

    if (!Number.isFinite(lm.x) || !Number.isFinite(lm.y)) {
      return invalid('DEGENERATE_GEOMETRY')
    }

    for (const confidence of [lm.visibility, lm.presence]) {
      if (confidence !== undefined) {
        if (
          !Number.isFinite(confidence) ||
          confidence < minConfidence ||
          confidence > 1
        ) {
          return invalid('LOW_CONFIDENCE')
        }
      }
    }
  }

  // 위 검사에서 필수 랜드마크의 존재 여부를 확인했다.
  const point = (name: SideKickLandmarkName): Point => {
    const lm = input.landmarks[name]!
    return {
      x: lm.x * input.width,
      y: lm.y * input.height,
    }
  }

  const leftHip = point('LEFT_HIP')
  const rightHip = point('RIGHT_HIP')
  const leftKnee = point('LEFT_KNEE')
  const rightKnee = point('RIGHT_KNEE')
  const leftAnkle = point('LEFT_ANKLE')
  const rightAnkle = point('RIGHT_ANKLE')
  const leftShoulder = point('LEFT_SHOULDER')
  const rightShoulder = point('RIGHT_SHOULDER')

  const leftKneeAngle = angle(leftHip, leftKnee, leftAnkle)
  const rightKneeAngle = angle(rightHip, rightKnee, rightAnkle)

  const shoulderMid = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  }

  const hipMid = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  }

  const torsoDx = shoulderMid.x - hipMid.x
  const torsoDy = hipMid.y - shoulderMid.y
  const torsoLength = Math.hypot(torsoDx, torsoDy)

  if (leftKneeAngle === null || rightKneeAngle === null || torsoLength < 1e-6) {
    return invalid('DEGENERATE_GEOMETRY')
  }

  return {
    valid: true,
    reason: null,
    metrics: {
      left_knee_angle_deg: round4(leftKneeAngle),
      right_knee_angle_deg: round4(rightKneeAngle),
      torso_lateral_lean_2d_deg: round4(
        (Math.atan2(torsoDx, torsoDy) * 180) / Math.PI,
      ),
      shoulder_screen_tilt_deg: round4(
        horizontalTilt(leftShoulder, rightShoulder),
      ),
      pelvis_screen_tilt_deg: round4(horizontalTilt(leftHip, rightHip)),
      left_ankle_relative_x_ratio: round4(
        (leftAnkle.x - leftHip.x) / torsoLength,
      ),
      right_ankle_relative_x_ratio: round4(
        (rightAnkle.x - rightHip.x) / torsoLength,
      ),
    },
  }
}
