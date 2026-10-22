/** 세션 JSON의 호환성 버전. 백엔드 연동 시에도 같은 구조를 사용한다. */
export const ENVIRONMENT_EVENT_SCHEMA_VERSION = 1

export type EnvironmentSessionResult = 'PASS' | 'FAIL' | 'CANCELLED' | 'ERROR'

export type EnvironmentEventType =
  /** 카메라가 실제로 켜져 새 환경 점검 세션을 시작한 경우. 세션당 한 번만 기록한다. */
  | 'CAMERA_ON'
  /** 사용자가 카메라를 꺼서 진행 중인 검사를 취소한 경우. 이미지·영상은 기록하지 않는다. */
  | 'CAMERA_OFF'
  /** YOLO 모델은 준비됐지만 아직 실제 추론 성공을 뜻하지는 않는다. */
  | 'MODEL_READY'
  /** 모델 초기화 실패. 오류 코드처럼 최소 기술 정보만 기록한다. */
  | 'MODEL_ERROR'
  /** 객체가 0개여도 실제 YOLO 추론이 최초로 완료된 경우. 세션당 한 번이다. */
  | 'FIRST_INFERENCE'
  /** 사람 수가 2명 이상 상태로 바뀐 경우만 기록하며, 유지되는 프레임마다 반복하지 않는다. */
  | 'MULTIPLE_PEOPLE'
  /** 다인원 상태에서 정확히 한 명으로 회복한 상태 전환 이벤트. */
  | 'PERSON_COUNT_NORMAL'
  /** MediaPipe 전신 인식이 유효 상태에서 실패 상태로 바뀐 경우. */
  | 'POSE_INVALID'
  /** 전신은 인식됐지만 가이드 영역 정렬을 만족하지 못한 상태 변화. */
  | 'ALIGNMENT_FAIL'
  /** 모든 시작 조건이 처음 충족되어 2초 카운트다운을 시작한 경우. */
  | 'COUNTDOWN_STARTED'
  /** 진행 중인 카운트다운이 조건 실패로 실제 초기화된 경우. */
  | 'COUNTDOWN_RESET'
  /** 정상 조건을 2초 유지해 자동 시작을 결정한 최종 PASS 이벤트. */
  | 'PASS_AUTO_START'
  /** 사용자가 미통과 상태에서 명시적으로 점검을 끝낸 최종 FAIL 이벤트. */
  | 'FAIL_MANUAL_END'
  /** 사용자가 카메라를 끄거나 점검 중 나가서 진행 중 세션을 취소한 최종 이벤트. */
  | 'CHECK_CANCELLED'
  /** 복구 불가능한 기술 오류로 세션을 끝낸 최종 ERROR 이벤트. */
  | 'CHECK_ERROR'

export const EVENT_DESCRIPTIONS: Record<EnvironmentEventType, string> = {
  CAMERA_ON: '카메라 활성화 및 환경 점검 세션 시작',
  CAMERA_OFF: '카메라를 꺼 환경 점검 취소',
  MODEL_READY: 'YOLO 모델 실행 준비 완료',
  MODEL_ERROR: 'YOLO 모델 초기화 실패',
  FIRST_INFERENCE: '첫 YOLO 추론 성공',
  MULTIPLE_PEOPLE: '사람 2명 이상 감지',
  PERSON_COUNT_NORMAL: '사람 수가 정확히 1명으로 회복',
  POSE_INVALID: 'MediaPipe 전신 인식 실패',
  ALIGNMENT_FAIL: '가이드 영역 정렬 실패',
  COUNTDOWN_STARTED: '정상 환경 2초 측정 시작',
  COUNTDOWN_RESET: '정상 환경 유지 조건이 깨져 측정 초기화',
  PASS_AUTO_START: '정상 환경 2초 유지, 운동 자동 시작',
  FAIL_MANUAL_END: '사용자가 미통과 상태에서 점검 종료',
  CHECK_CANCELLED: '사용자가 진행 중인 환경 점검 취소',
  CHECK_ERROR: '복구 불가능한 환경 점검 오류',
}

export type EnvironmentEventSource =
  'YOLO' | 'MEDIAPIPE' | 'ENVIRONMENT_POLICY' | 'FRONTEND'
export type EnvironmentEventLevel = 'INFO' | 'WARNING' | 'ERROR'

/** 이벤트별 발생 주체와 심각도. 화면과 JSON이 같은 정의를 사용한다. */
export const EVENT_METADATA: Record<
  EnvironmentEventType,
  { source: EnvironmentEventSource; level: EnvironmentEventLevel }
> = {
  CAMERA_ON: { source: 'FRONTEND', level: 'INFO' },
  CAMERA_OFF: { source: 'FRONTEND', level: 'INFO' },
  MODEL_READY: { source: 'YOLO', level: 'INFO' },
  MODEL_ERROR: { source: 'YOLO', level: 'ERROR' },
  FIRST_INFERENCE: { source: 'YOLO', level: 'INFO' },
  MULTIPLE_PEOPLE: { source: 'ENVIRONMENT_POLICY', level: 'WARNING' },
  PERSON_COUNT_NORMAL: { source: 'ENVIRONMENT_POLICY', level: 'INFO' },
  POSE_INVALID: { source: 'MEDIAPIPE', level: 'WARNING' },
  ALIGNMENT_FAIL: { source: 'ENVIRONMENT_POLICY', level: 'WARNING' },
  COUNTDOWN_STARTED: { source: 'ENVIRONMENT_POLICY', level: 'INFO' },
  COUNTDOWN_RESET: { source: 'ENVIRONMENT_POLICY', level: 'WARNING' },
  PASS_AUTO_START: { source: 'ENVIRONMENT_POLICY', level: 'INFO' },
  FAIL_MANUAL_END: { source: 'FRONTEND', level: 'WARNING' },
  CHECK_CANCELLED: { source: 'FRONTEND', level: 'INFO' },
  CHECK_ERROR: { source: 'FRONTEND', level: 'ERROR' },
}

export type DetectionSummary = {
  person_count: number
  total_detection_count: number
  other_object_count: number
}

export type EnvironmentEvent = {
  type: EnvironmentEventType
  source: EnvironmentEventSource
  level: EnvironmentEventLevel
  at: string
  details: Record<string, string | number | boolean | null>
}
export type EnvironmentSession = {
  schema_version: number
  session_id: string
  exercise_id: null
  mode: 'EXERCISE' | 'STUDY'
  started_at: string
  ended_at: string | null
  result: EnvironmentSessionResult | null
  reason_code: EnvironmentEventType | null
  model_name: 'yolo11n'
  provider: 'webgpu' | 'wasm' | null
  hold_ms: number
  events: EnvironmentEvent[]
}
