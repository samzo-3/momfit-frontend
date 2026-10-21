import type { PoseLandmarkPoint } from '../../mediapipe/usePoseLandmarker'
import type { StudyJudgment, StudyStepNumber } from './side-kick-study'

type Point = PoseLandmarkPoint

export type ReadyPose = {
  points: Point[]
}

export type ScoreResult = {
  judgment: StudyJudgment
  details: Record<string, number>
}

const REQUIRED = [11, 12, 23, 24, 25, 26, 27, 28]

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function angle(a: Point, b: Point, c: Point): number {
  const ax = a.x - b.x
  const ay = a.y - b.y
  const cx = c.x - b.x
  const cy = c.y - b.y
  const den = Math.hypot(ax, ay) * Math.hypot(cx, cy)
  if (den < 0.00001) return 0
  const cosine = Math.max(-1, Math.min(1, (ax * cx + ay * cy) / den))
  return Math.acos(cosine) * (180 / Math.PI)
}

function center(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: 0 }
}

function grade(error: number, tolerance: number): number {
  return Math.max(0, 1 - error / tolerance)
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100
}

function unavailable(reason: 'TRACKING' | 'FRONT' | 'POSE'): ScoreResult {
  return {
    judgment: { status: 'UNAVAILABLE', reason },
    details: {},
  }
}

function visible(p: Point | undefined): p is Point {
  return (
    !!p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    (p.visibility ?? 1) >= 0.5 &&
    (p.presence ?? 1) >= 0.5 &&
    p.x >= 0 &&
    p.x <= 1 &&
    p.y >= 0 &&
    p.y <= 1
  )
}

function getBase(points: Point[]) {
  const lHip = points[23]
  const rHip = points[24]
  const lShoulder = points[11]
  const rShoulder = points[12]
  const pelvis = center(lHip, rHip)
  const shoulders = center(lShoulder, rShoulder)
  const width = distance(lHip, rHip)

  return { pelvis, shoulders, width }
}

function torsoAngle(points: Point[]): number {
  const { pelvis, shoulders } = getBase(points)
  return (
    (Math.atan2(shoulders.x - pelvis.x, pelvis.y - shoulders.y) * 180) / Math.PI
  )
}

function ankleVector(points: Point[], side: 'RIGHT' | 'LEFT') {
  const { pelvis, width } = getBase(points)
  const p = points[side === 'RIGHT' ? 28 : 27]
  return {
    x: (p.x - pelvis.x) / width,
    y: (p.y - pelvis.y) / width,
  }
}

function elbowPosition(points: Point[], side: 'RIGHT' | 'LEFT') {
  const index = side === 'RIGHT' ? 14 : 13
  const shoulder = points[side === 'RIGHT' ? 12 : 11]
  const elbow = points[index]
  const shoulderWidth = distance(points[11], points[12])
  return {
    x: (elbow.x - shoulder.x) / shoulderWidth,
    y: (elbow.y - shoulder.y) / shoulderWidth,
  }
}

function positionError(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * 정면 카메라용 실험적 유사도 점수.
 * - landmark 인덱스는 MediaPipe 신체 좌우를 따른다.
 * - 화면 좌우 반전과 혼동하지 않는다.
 * - 이 점수는 의학적 안전 판정이 아니다.
 */
export function scoreSideKickStep(
  stepNo: StudyStepNumber,
  points: Point[],
  ready: ReadyPose | null,
): ScoreResult {
  if (points.length < 33 || REQUIRED.some((i) => !visible(points[i]))) {
    return unavailable('TRACKING')
  }

  const { width } = getBase(points)
  if (width < 0.025 || !Number.isFinite(width)) {
    return unavailable('POSE')
  }

  // 카메라로 관찰한 2D 정면 후보 검사. 완전한 방향 추정은 아니다.
  const shoulderWidth = distance(points[11], points[12])
  if (shoulderWidth < 0.04 || shoulderWidth / width < 0.5) {
    return unavailable('FRONT')
  }

  const torso = torsoAngle(points)
  const leftKnee = angle(points[23], points[25], points[27])
  const rightKnee = angle(points[24], points[26], points[28])
  const ankleSpread = distance(points[27], points[28]) / width

  const details: Record<string, number> = {
    torso_angle_deg: torso,
    left_knee_angle_deg: leftKnee,
    right_knee_angle_deg: rightKnee,
    ankle_distance_ratio: ankleSpread,
  }

  // STEP 1: 정면과 기본 준비 상태만 느슨하게 확인.
  // 팔꿈치 기준이나 1프레임짜리 트레이너 수치는 강제하지 않는다.
  if (stepNo === 1 || stepNo === 3 || stepNo === 5) {
    const straight =
      (grade(Math.abs(leftKnee - 175), 35) +
        grade(Math.abs(rightKnee - 175), 35)) /
      2
    const upright = grade(Math.abs(torso), 18)
    const feet = grade(Math.max(0, ankleSpread - 2.3), 1.0)
    const ankleHeightDifference = Math.abs(points[27].y - points[28].y) / width
    const feetLevel = grade(ankleHeightDifference, 0.75)

    const score = clampScore(
      straight * 30 + upright * 35 + feet * 15 + feetLevel * 20,
    )
    return {
      judgment: {
        status: 'EVALUATED',
        score,
        eventCode: score >= 80 ? null : 'READY_POSITION_ADJUST',
      },
      details,
    }
  }

  if (!ready || ready.points.length < 33) {
    return unavailable('POSE')
  }

  const base = ready.points
  const side: 'RIGHT' | 'LEFT' = stepNo <= 3 ? 'LEFT' : 'RIGHT'
  const targetAnkle = ankleVector(points, side)
  const originalAnkle = ankleVector(base, side)

  const elbowNow = elbowPosition(points, side)
  const elbowBase = elbowPosition(base, side)
  const elbowError = positionError(elbowNow, elbowBase)

  const knee = side === 'RIGHT' ? rightKnee : leftKnee
  const baseTorso = torsoAngle(base)

  details.ankle_horizontal_delta_ratio = targetAnkle.x - originalAnkle.x
  details.ankle_vertical_delta_ratio = targetAnkle.y - originalAnkle.y
  details.elbow_position_delta_ratio = elbowError

  // 사용자 기준 준비자세보다 다리가 움직인 정도.
  // 2D 원근·카메라 각도에 영향을 받는 실험용 지표.
  const xMovement = Math.abs(targetAnkle.x - originalAnkle.x)
  const lift = Math.max(0, originalAnkle.y - targetAnkle.y)

  // 들어올리기: 실제로 움직인 다리의 이동이 없으면
  // 다른 관절 점수가 높아도 PASS하지 못하게 배점.
  if (stepNo === 2 || stepNo === 4) {
    // 준비 자세에서 해당 발목이 목표 이동량에 도달할 때까지 가점.
    // 목표보다 더 들어 올려도 점수가 역전되지 않는다.
    const liftScore = Math.min(1, lift / 0.35)
    const spreadScore = Math.min(1, xMovement / 0.4)
    const kneeScore = grade(Math.abs(knee - 175), 35)

    // 준비 자세와 같으면 0점, 몸통이 기울면 가점.
    // 방향의 정확성은 별도 검증 전까지 점수에 포함하지 않는다.
    const torsoLeanDeg = Math.abs(torso - baseTorso)
    const torsoScore = Math.min(1, torsoLeanDeg / 10)

    details.torso_lean_from_ready_deg = torsoLeanDeg

    // 팔꿈치 위치는 아직 전문가의 목표 좌표가 없으므로
    // 움직임 감지 보조 정보로만 사용하며 PASS 배점에 넣지 않는다.
    const rawScore = clampScore(
      liftScore * 40 + spreadScore * 35 + kneeScore * 15 + torsoScore * 10,
    )

    // 정지 상태나 작은 자세 흔들림만으로는 PASS할 수 없다.
    // 임시 동작 감지 기준이며 의학적 안전 기준이 아니다.
    const movedEnough = lift >= 0.22 || (lift >= 0.08 && xMovement >= 0.3)

    const score = movedEnough ? rawScore : Math.min(rawScore, 79)

    details.movement_gate_passed = movedEnough ? 1 : 0
    details.raw_score = rawScore
    details.lift_score_points = liftScore * 40
    details.horizontal_score_points = spreadScore * 35
    details.knee_score_points = kneeScore * 15
    details.torso_score_points = torsoScore * 10
    details.lift_ratio = lift
    details.horizontal_movement_ratio = xMovement
    details.elbow_movement_ratio = elbowError

    const eventCode = !movedEnough
      ? `${side}_LEG_HEIGHT_ADJUST`
      : liftScore < 0.65
        ? `${side}_LEG_HEIGHT_ADJUST`
        : spreadScore < 0.65
          ? `${side}_LEG_POSITION_ADJUST`
          : kneeScore < 0.5
            ? `${side}_KNEE_POSITION_ADJUST`
            : 'POSTURE_ADJUST'

    return {
      judgment: {
        status: 'EVALUATED',
        score,
        eventCode: score >= 80 ? null : eventCode,
      },
      details,
    }
  }

  // 복귀: 준비 당시 발목·몸통·팔꿈치 위치와 비교.
  const ankleError = positionError(targetAnkle, originalAnkle)
  const torsoError = Math.abs(torso - baseTorso)
  const otherSide: 'RIGHT' | 'LEFT' = side === 'RIGHT' ? 'LEFT' : 'RIGHT'
  const otherElbowError = positionError(
    elbowPosition(points, otherSide),
    elbowPosition(base, otherSide),
  )

  const ankleScore = grade(ankleError, 0.6)
  const torsoScore = grade(torsoError, 20)
  const elbowScore = grade((elbowError + otherElbowError) / 2, 0.9)
  const kneeScore = grade(Math.abs(knee - 175), 35)

  const score = clampScore(
    ankleScore * 40 + torsoScore * 25 + elbowScore * 20 + kneeScore * 15,
  )

  details.return_ankle_error_ratio = ankleError
  details.return_torso_error_deg = torsoError

  const eventCode =
    ankleScore < 0.7
      ? `${side}_LEG_RETURN_ADJUST`
      : torsoScore < 0.7
        ? 'TORSO_RETURN_ADJUST'
        : elbowScore < 0.7
          ? 'ELBOW_RETURN_ADJUST'
          : 'RETURN_POSTURE_ADJUST'

  return {
    judgment: {
      status: 'EVALUATED',
      score,
      eventCode: score >= 80 ? null : eventCode,
    },
    details,
  }
}
