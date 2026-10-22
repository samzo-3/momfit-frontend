export type ExerciseMode = 'EXERCISE' | 'STUDY'

export type Detection = {
  /** Frame-local display number, not a persistent tracking ID. */
  detectionId: number
  classId: number
  className: string
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export type PersonDetection = Detection

/** MediaPipe가 반환한 원본 정규화 관절 좌표. 화면 표시만 좌우 반전하며 이 값은 변경하지 않는다. */
export type PoseLandmark = {
  x: number
  y: number
  z?: number
  visibility?: number
  presence?: number
}

export type GuideAlignment = 'PASS' | 'FAIL' | 'NOT_EVALUABLE'

export type EnvironmentResult = {
  people: Detection[]
  /** POSE_TRACKED: MediaPipe가 관절 배열을 반환했는지 여부. */
  poseTracked: boolean
  /** FULL_BODY_VALID: 필수 33개 중 전신 판정에 필요한 관절의 가시성 조건 통과 여부. */
  fullBodyValid: boolean
  /** GUIDE_ALIGNED: 전신 유효일 때만 PASS/FAIL을 판정한다. */
  guideAlignment: GuideAlignment
  inGuide: boolean
  ready: boolean
  reason: string
}
