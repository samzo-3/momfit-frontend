import { ENVIRONMENT_CHECK_CONFIG } from '../environment-policy'
import {
  ENVIRONMENT_EVENT_SCHEMA_VERSION,
  EVENT_METADATA,
  type EnvironmentEvent,
  type EnvironmentEventType,
  type EnvironmentSession,
  type EnvironmentSessionResult,
} from './event-types'

/** 프레임 로그가 아닌 상태 변화만 최대 40개 보관하는 검사 세션 로거다. */
export class EnvironmentEventLogger {
  private session: EnvironmentSession | null = null
  start(mode: 'EXERCISE' | 'STUDY'): EnvironmentSession {
    this.session = {
      schema_version: ENVIRONMENT_EVENT_SCHEMA_VERSION,
      session_id: crypto.randomUUID(),
      exercise_id: null,
      mode,
      started_at: new Date().toISOString(),
      ended_at: null,
      result: null,
      reason_code: null,
      model_name: 'yolo11n',
      provider: null,
      hold_ms: ENVIRONMENT_CHECK_CONFIG.holdMs,
      events: [],
    }
    return this.snapshot() as EnvironmentSession
  }
  record(
    type: EnvironmentEventType,
    details: EnvironmentEvent['details'] = {},
  ): boolean {
    if (
      !this.session ||
      this.session.result ||
      this.session.events.some(
        (event) =>
          event.type === type &&
          [
            'CAMERA_ON',
            'MODEL_READY',
            'FIRST_INFERENCE',
            'PASS_AUTO_START',
          ].includes(type),
      )
    )
      return false
    this.session.events.push({
      type,
      ...EVENT_METADATA[type],
      at: new Date().toISOString(),
      details,
    })
    if (this.session.events.length > 40) this.session.events.shift()
    return true
  }
  setProvider(provider: EnvironmentSession['provider']) {
    if (this.session) this.session.provider = provider
  }
  /** 종료된 세션은 복사본으로 반환한다. 이후 비동기 저장 중에도 원본이 바뀌지 않는다. */
  finish(
    result: EnvironmentSessionResult,
    reason: EnvironmentEventType,
    details: EnvironmentEvent['details'] = {},
  ) {
    if (!this.session || this.session.result) return null
    this.record(reason, details)
    this.session.result = result
    this.session.reason_code = reason
    this.session.ended_at = new Date().toISOString()
    return this.snapshot()
  }

  /** 화면 로그와 저장 JSON이 반드시 같은 이벤트 배열을 사용하도록 읽기 전용 복사본을 제공한다. */
  snapshot(): EnvironmentSession | null {
    return this.session
      ? { ...this.session, events: [...this.session.events] }
      : null
  }
}
