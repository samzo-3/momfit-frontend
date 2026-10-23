import { describe, expect, it } from 'vitest'
import {
  SideKickVoicePolicy,
  type CriterionFailure,
  type SideKickVoiceSnapshot,
} from './side-kick-voice-policy'
import type { StudyStep } from '../analyzers/sideKick/side-kick-study-flow'

function sample(
  step: StudyStep | null,
  overrides: Partial<SideKickVoiceSnapshot> = {},
): SideKickVoiceSnapshot {
  return {
    flow: {
      step,
      completed: step === null,
      finalResult: step === null ? 'PASS' : null,
      records: [],
      events: [],
      feedbackCount: 0,
    },
    lift: null,
    returning: null,
    ...overrides,
  }
}

function liftSample(
  valid: boolean,
  movementObserved = false,
  step: 2 | 4 = 2,
  criterionFailures: CriterionFailure[] = [],
): SideKickVoiceSnapshot {
  return sample(step, {
    lift: {
      state: 'UNDETERMINED',
      valid,
      measurementStatus: valid ? 'VALID' : 'INVALID',
      criterionFailures,
      movementObserved,
    },
  })
}

function returnSample(valid: boolean): SideKickVoiceSnapshot {
  return sample(3, {
    returning: {
      state: 'UNDETERMINED',
      neutralConfirmed: false,
      valid,
      neutralFrames: 0,
      neutralDurationMs: 0,
    },
  })
}

describe('SideKickVoicePolicy', () => {
  it('STEP 시작 안내를 중복 출력하지 않는다', () => {
    const policy = new SideKickVoicePolicy()

    expect(policy.update(0, sample(1))?.eventCode).toBe('SK_READY_START')
    expect(policy.update(100, sample(1))).toBeNull()
  })

  it('STEP이 바뀌면 새로운 안내를 출력한다', () => {
    const policy = new SideKickVoicePolicy()

    policy.update(0, sample(1))

    expect(policy.update(100, sample(2))?.eventCode).toBe('SK_LEFT_LIFT_START')
  })

  it('움직임이 없거나 정상 HOLD 중에는 추가 음성을 출력하지 않는다', () => {
    const policy = new SideKickVoicePolicy()

    policy.update(0, sample(2))

    expect(policy.update(4000, liftSample(true))).toBeNull()

    expect(policy.update(8100, liftSample(true))).toBeNull()
  })

  it('동작이 관찰되었어도 정상 진행 음성을 추가하지 않는다', () => {
    const policy = new SideKickVoicePolicy()

    policy.update(0, sample(2))

    expect(policy.update(8100, liftSample(true, true))).toBeNull()
  })

  it('측정은 유효하지만 기준 미달 원인이 없는 Snapshot에는 교정 음성을 추측하지 않는다', () => {
    const policy = new SideKickVoicePolicy()
    policy.update(0, sample(2))

    const criterionMiss = liftSample(true, true)

    expect(policy.update(4000, criterionMiss)).toBeNull()
  })

  it('동일한 기준 미달이 2초 이상 유지되면 우선순위가 가장 높은 교정 음성을 출력한다', () => {
    const policy = new SideKickVoicePolicy()
    policy.update(0, sample(2))

    const failures: CriterionFailure[] = [
      'TORSO_ASYMMETRY_INSUFFICIENT',
      'LEG_LIFT_INSUFFICIENT',
      'TORSO_BEND_INSUFFICIENT',
    ]

    expect(policy.update(100, liftSample(true, true, 2, failures))).toBeNull()
    expect(policy.update(2099, liftSample(true, true, 2, failures))).toBeNull()
    expect(
      policy.update(2100, liftSample(true, true, 2, failures))?.eventCode,
    ).toBe('SK_LEG_LIFT_MORE')
  })

  it('교정 음성은 8초 cooldown 뒤에만 같은 원인으로 다시 출력한다', () => {
    const policy = new SideKickVoicePolicy()
    const failures: CriterionFailure[] = ['TORSO_BEND_INSUFFICIENT']
    policy.update(0, sample(4))
    policy.update(100, liftSample(true, true, 4, failures))

    expect(
      policy.update(2100, liftSample(true, true, 4, failures))?.eventCode,
    ).toBe('SK_TORSO_BEND_MORE')
    expect(policy.update(9999, liftSample(true, true, 4, failures))).toBeNull()
    expect(
      policy.update(10100, liftSample(true, true, 4, failures))?.eventCode,
    ).toBe('SK_TORSO_BEND_MORE')
  })

  it('INVALID 측정 또는 움직임 미감지 중에는 교정 음성을 출력하지 않는다', () => {
    const policy = new SideKickVoicePolicy()
    const failures: CriterionFailure[] = ['LEG_LIFT_INSUFFICIENT']
    policy.update(0, sample(2))

    expect(policy.update(100, liftSample(false, true, 2, failures))).toBeNull()
    expect(policy.update(2100, liftSample(false, true, 2, failures))).toBeNull()
    expect(policy.update(2200, liftSample(true, false, 2, failures))).toBeNull()
    expect(policy.update(4300, liftSample(true, false, 2, failures))).toBeNull()
  })

  it('원인 변경, PASS, STEP 전환은 이전 교정 지속 시간을 초기화한다', () => {
    const policy = new SideKickVoicePolicy()
    const leg: CriterionFailure[] = ['LEG_LIFT_INSUFFICIENT']
    const bend: CriterionFailure[] = ['TORSO_BEND_INSUFFICIENT']
    policy.update(0, sample(2))
    policy.update(100, liftSample(true, true, 2, leg))
    policy.update(1000, liftSample(true, true, 2, bend))
    expect(policy.update(2999, liftSample(true, true, 2, bend))).toBeNull()
    expect(
      policy.update(3000, liftSample(true, true, 2, bend))?.eventCode,
    ).toBe('SK_TORSO_BEND_MORE')

    const passed = liftSample(true, true, 2, bend)
    if (!passed.lift) throw new Error('LIFT_SNAPSHOT_REQUIRED')
    passed.lift.state = 'PASS'
    expect(policy.update(3100, passed)).toBeNull()

    expect(policy.update(3200, sample(4))?.eventCode).toBe(
      'SK_RIGHT_LIFT_START',
    )
    expect(policy.update(3300, liftSample(true, true, 4, leg))).toBeNull()
    expect(policy.update(5299, liftSample(true, true, 4, leg))).toBeNull()
    expect(policy.update(5300, liftSample(true, true, 4, leg))?.eventCode).toBe(
      'SK_LEG_LIFT_MORE',
    )
  })

  it('HOLD 시작과 중단은 자세 오류 안내로 변환하지 않는다', () => {
    const policy = new SideKickVoicePolicy()

    policy.update(0, sample(2))

    const snapshot = liftSample(true, true)
    if (!snapshot.lift) throw new Error('LIFT_SNAPSHOT_REQUIRED')
    snapshot.lift.state = 'HOLDING'

    expect(policy.update(1000, snapshot)).toBeNull()

    expect(policy.update(1100, snapshot)).toBeNull()
  })

  it('동일 HOLD 이벤트가 30 프레임 이어져도 음성을 출력하지 않는다', () => {
    const policy = new SideKickVoicePolicy()
    policy.update(0, sample(2))
    const snapshot = liftSample(true, true)
    if (!snapshot.lift) throw new Error('LIFT_SNAPSHOT_REQUIRED')
    snapshot.lift.state = 'HOLDING'

    const events = Array.from({ length: 30 }, (_, index) =>
      policy.update(100 + index * 100, snapshot),
    ).filter(Boolean)

    expect(events).toHaveLength(0)
  })

  it('유효하지 않은 자세 데이터가 3초 지속되면 안내한다', () => {
    const policy = new SideKickVoicePolicy()

    policy.update(0, sample(2))
    policy.update(1000, liftSample(false))

    expect(policy.update(4100, liftSample(false))?.eventCode).toBe(
      'SK_TRACKING_LOST',
    )
    expect(policy.update(5000, liftSample(false))).toBeNull()
  })

  it('반복 TRACKING_LOST는 cooldown 뒤에만 다시 출력한다', () => {
    const policy = new SideKickVoicePolicy()
    policy.update(0, sample(2))
    policy.update(1000, liftSample(false))

    expect(policy.update(4000, liftSample(false))?.eventCode).toBe(
      'SK_TRACKING_LOST',
    )
    expect(policy.update(5000, liftSample(false))).toBeNull()
    expect(policy.update(12000, liftSample(false))?.eventCode).toBe(
      'SK_TRACKING_LOST',
    )
  })

  it('정상 측정으로 회복하면 다음 지속 추적 실패를 새 오류로 처리한다', () => {
    const policy = new SideKickVoicePolicy()
    policy.update(0, sample(2))
    policy.update(1000, liftSample(false))
    expect(policy.update(4000, liftSample(false))?.eventCode).toBe(
      'SK_TRACKING_LOST',
    )

    policy.update(4100, liftSample(true, true))
    policy.update(5000, liftSample(false))
    expect(policy.update(8000, liftSample(false))?.eventCode).toBe(
      'SK_TRACKING_LOST',
    )
  })

  it('복귀 STEP의 측정 불량도 자세 오류와 구분해 지속될 때만 안내한다', () => {
    const policy = new SideKickVoicePolicy()
    policy.update(0, sample(3))
    policy.update(1000, returnSample(false))

    expect(policy.update(4000, returnSample(false))?.eventCode).toBe(
      'SK_TRACKING_LOST',
    )
  })

  it('STEP 2·4의 3초 미만 측정 불량은 안내하지 않고 3초 이후 한 번만 안내한다', () => {
    const policy = new SideKickVoicePolicy()

    policy.update(0, sample(2))
    policy.update(1000, liftSample(false))
    expect(policy.update(3999, liftSample(false))).toBeNull()
    expect(policy.update(4000, liftSample(false))?.eventCode).toBe(
      'SK_TRACKING_LOST',
    )
    expect(policy.update(5000, liftSample(false))).toBeNull()

    expect(policy.update(6000, sample(4))?.eventCode).toBe(
      'SK_RIGHT_LIFT_START',
    )
    policy.update(7000, liftSample(false, false, 4))
    expect(policy.update(9999, liftSample(false, false, 4))).toBeNull()
    expect(policy.update(10000, liftSample(false, false, 4))?.eventCode).toBe(
      'SK_TRACKING_LOST',
    )
    expect(policy.update(11000, liftSample(false, false, 4))).toBeNull()
  })

  it('동일한 타임스탬프에서는 중복 안내하지 않는다', () => {
    const policy = new SideKickVoicePolicy()

    policy.update(0, sample(2))

    expect(policy.update(0, sample(3))).toBeNull()
  })

  it('전체 운동 완료 안내는 한 번만 출력한다', () => {
    const policy = new SideKickVoicePolicy()

    policy.update(0, sample(5))

    expect(policy.update(100, sample(null))?.eventCode).toBe(
      'SK_STUDY_COMPLETED',
    )
    expect(policy.update(200, sample(null))).toBeNull()
  })
})
