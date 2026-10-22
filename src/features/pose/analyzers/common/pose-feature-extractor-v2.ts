import type {
  PoseFrame,
  PoseLandmarkPoint,
} from '../../mediapipe/usePoseLandmarker'

type Point = PoseLandmarkPoint
type Vec3 = { x: number; y: number; z: number }
type FeatureValue = number | null

export type PoseFeaturesV2 = {
  timestampMs: number
  features: Record<string, FeatureValue>
  quality: {
    worldAvailable: boolean
    validFeatureCount: number
    invalidFeatures: string[]
  }
}

const I = {
  nose: 0,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const

const UP: Vec3 = { x: 0, y: -1, z: 0 }
const EPS = 1e-6

function valid(p: Point | undefined): p is Point {
  return (
    !!p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    Number.isFinite(p.z) &&
    (p.visibility ?? 0) >= 0.5 &&
    (p.presence ?? 0) >= 0.5
  )
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z)
}

function unit(a: Vec3): Vec3 | null {
  const n = length(a)
  return n > EPS ? { x: a.x / n, y: a.y / n, z: a.z / n } : null
}

function mid(a: Vec3, b: Vec3): Vec3 {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  }
}

function angle(a: Vec3, b: Vec3, c: Vec3): number | null {
  const ba = unit(sub(a, b))
  const bc = unit(sub(c, b))
  if (!ba || !bc) return null
  const cosine = Math.max(-1, Math.min(1, dot(ba, bc)))
  return (Math.acos(cosine) * 180) / Math.PI
}

function projectedAxis(axis: Vec3, normal: Vec3): Vec3 | null {
  const projection = dot(axis, normal)
  return unit({
    x: axis.x - projection * normal.x,
    y: axis.y - projection * normal.y,
    z: axis.z - projection * normal.z,
  })
}

export function extractPoseFeaturesV2(frame: PoseFrame): PoseFeaturesV2 {
  const points = frame.worldLandmarks
  const features: Record<string, FeatureValue> = {}

  const get = (index: number): Point | null => {
    const p = points?.[index]
    return valid(p) ? p : null
  }

  const set = (name: string, value: number | null) => {
    features[name] = value !== null && Number.isFinite(value) ? value : null
  }

  const lh = get(I.leftHip)
  const rh = get(I.rightHip)
  const ls = get(I.leftShoulder)
  const rs = get(I.rightShoulder)

  const pelvis = lh && rh ? mid(lh, rh) : null
  const shoulders = ls && rs ? mid(ls, rs) : null

  // 월드 좌표 Y 위쪽을 중력 반대 방향의 후보로 사용.
  // 실제 카메라 기울기 보정이나 임상적 수직 측정은 아님.
  const leftAxis = lh && rh ? projectedAxis(sub(lh, rh), UP) : null

  const forward = leftAxis ? unit(cross(leftAxis, UP)) : null

  const torso = pelvis && shoulders ? unit(sub(shoulders, pelvis)) : null

  // + 값: 사용자 신체 기준 왼쪽 측굴 후보
  // - 값: 오른쪽 측굴 후보
  // 부호는 실측 영상에서 반드시 검증해야 함.
  set(
    'trunk_signed_lateral_tilt_deg',
    torso && leftAxis
      ? (Math.atan2(dot(torso, leftAxis), dot(torso, UP)) * 180) / Math.PI
      : null,
  )

  set(
    'trunk_vertical_deviation_deg',
    torso
      ? (Math.acos(Math.max(-1, Math.min(1, dot(torso, UP)))) * 180) / Math.PI
      : null,
  )

  if (lh && rh && leftAxis) {
    const hipLine = unit(sub(lh, rh))
    set(
      'pelvis_lateral_tilt_deg',
      hipLine
        ? (Math.atan2(dot(hipLine, UP), dot(hipLine, leftAxis)) * 180) / Math.PI
        : null,
    )
  } else {
    set('pelvis_lateral_tilt_deg', null)
  }

  for (const side of ['left', 'right'] as const) {
    const hip = get(side === 'left' ? I.leftHip : I.rightHip)
    const knee = get(side === 'left' ? I.leftKnee : I.rightKnee)
    const ankle = get(side === 'left' ? I.leftAnkle : I.rightAnkle)
    const shoulder = get(side === 'left' ? I.leftShoulder : I.rightShoulder)
    const elbow = get(side === 'left' ? I.leftElbow : I.rightElbow)
    const wrist = get(side === 'left' ? I.leftWrist : I.rightWrist)
    const ear = get(side === 'left' ? I.leftEar : I.rightEar)

    set(
      `${side}_knee_angle_deg`,
      hip && knee && ankle ? angle(hip, knee, ankle) : null,
    )

    set(
      `${side}_elbow_angle_deg`,
      shoulder && elbow && wrist ? angle(shoulder, elbow, wrist) : null,
    )

    const thigh = hip && knee ? unit(sub(knee, hip)) : null
    const outward =
      leftAxis && thigh
        ? (side === 'left' ? 1 : -1) * dot(thigh, leftAxis)
        : null

    const down = thigh ? -dot(thigh, UP) : null

    // 대퇴부의 좌우 측면 성분: 양수는 해당 다리 바깥 방향
    set(`${side}_thigh_outward_component`, outward)

    // 대퇴부가 아래쪽 수직축에서 바깥쪽으로 벌어진 후보각
    set(
      `${side}_thigh_lateral_angle_deg`,
      outward !== null && down !== null
        ? (Math.atan2(outward, down) * 180) / Math.PI
        : null,
    )

    // 골반 전방축 성분: 측면 상승과 앞쪽 들기를 구분하는 보조값
    set(
      `${side}_thigh_forward_component`,
      thigh && forward ? dot(thigh, forward) : null,
    )

    // 손목-같은쪽 귀 거리: 어깨 너비로 정규화
    const shoulderWidth = ls && rs ? length(sub(ls, rs)) : 0
    set(
      `${side}_wrist_ear_distance_ratio`,
      wrist && ear && shoulderWidth > EPS
        ? length(sub(wrist, ear)) / shoulderWidth
        : null,
    )

    // 팔꿈치가 몸 바깥쪽으로 얼마나 벌어졌는지
    set(
      `${side}_elbow_outward_ratio`,
      shoulder && elbow && leftAxis && shoulderWidth > EPS
        ? ((side === 'left' ? 1 : -1) * dot(sub(elbow, shoulder), leftAxis)) /
            shoulderWidth
        : null,
    )
  }

  const invalidFeatures = Object.entries(features)
    .filter(([, value]) => value === null)
    .map(([name]) => name)

  return {
    timestampMs: frame.timestampMs,
    features,
    quality: {
      worldAvailable: !!points && points.length === 33,
      validFeatureCount: Object.keys(features).length - invalidFeatures.length,
      invalidFeatures,
    },
  }
}
