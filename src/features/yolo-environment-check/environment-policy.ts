import type {
  EnvironmentResult,
  GuideAlignment,
  PersonDetection,
  PoseLandmark,
} from './types'

export const ENVIRONMENT_CHECK_CONFIG = {
  holdMs: 2_000,
  staleDetectionMs: 1_500,
  minVisibility: 0.5,
  guide: { left: 0.12, right: 0.88, top: 0.06, bottom: 0.94 },
} as const

// 전신 확인용: 머리, 양팔, 골반, 무릎, 발목, 발뒤꿈치, 발끝.
// 일부 관절만 보이는 상반신 프레임은 준비 상태가 될 수 없다.
const REQUIRED = [
  0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
] as const

export function poseAlignment(landmarks: PoseLandmark[] | null): {
  poseTracked: boolean
  fullBodyValid: boolean
  inGuide: boolean
  guideAlignment: GuideAlignment
} {
  const poseTracked = Boolean(landmarks?.length)
  const points =
    landmarks && landmarks.length >= 29
      ? REQUIRED.map((index) => landmarks[index])
      : []
  const fullBodyValid =
    points.length === REQUIRED.length &&
    points.every(
      (point) =>
        point &&
        (point.visibility ?? 1) >= ENVIRONMENT_CHECK_CONFIG.minVisibility &&
        (point.presence ?? 1) >= ENVIRONMENT_CHECK_CONFIG.minVisibility,
    )
  if (!fullBodyValid)
    return {
      poseTracked,
      fullBodyValid: false,
      inGuide: false,
      guideAlignment: 'NOT_EVALUABLE' as const,
    }
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const guide = ENVIRONMENT_CHECK_CONFIG.guide
  return {
    poseTracked: true,
    fullBodyValid: true,
    inGuide:
      Math.min(...xs) >= guide.left &&
      Math.max(...xs) <= guide.right &&
      Math.min(...ys) >= guide.top &&
      Math.max(...ys) <= guide.bottom,
    guideAlignment:
      Math.min(...xs) >= guide.left &&
      Math.max(...xs) <= guide.right &&
      Math.min(...ys) >= guide.top &&
      Math.max(...ys) <= guide.bottom
        ? 'PASS'
        : 'FAIL',
  }
}

export function evaluateEnvironment(
  people: PersonDetection[],
  pose: {
    poseTracked: boolean
    fullBodyValid: boolean
    inGuide: boolean
    guideAlignment: EnvironmentResult['guideAlignment']
  },
): EnvironmentResult {
  if (people.length !== 1)
    return {
      people,
      ...pose,
      ready: false,
      reason:
        people.length === 0
          ? '운동 대상자를 찾고 있습니다.'
          : '카메라 안에는 한 명만 있어야 합니다.',
    }
  if (!pose.fullBodyValid)
    return {
      people,
      ...pose,
      ready: false,
      reason: '전신이 카메라에 보이도록 서 주세요.',
    }
  if (!pose.inGuide)
    return {
      people,
      ...pose,
      ready: false,
      reason: '가이드 영역 안으로 이동해 주세요.',
    }
  return {
    people,
    ...pose,
    ready: true,
    reason: '환경 확인 완료. 자세를 유지해 주세요.',
  }
}
