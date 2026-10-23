import { describe, expect, it } from 'vitest'
import type { SideKickRuntimeSnapshot } from '../analyzers/sideKick/side-kick-study-runtime'
import type { StudyStep } from '../analyzers/sideKick/side-kick-study-flow'
import { SideKickVoiceBridge } from './side-kick-voice-bridge'

function snapshot(
  step: StudyStep | null,
  events: string[] = [],
): SideKickRuntimeSnapshot {
  return {
    flow: {
      step,
      completed: step === null,
      finalResult: step === null ? 'PASS' : null,
      records: [],
      events,
      feedbackCount: 0,
    },
    baseline: null,
    readySampleCount: 0,
    lift: null,
    returning: null,
  }
}

describe('SideKickVoiceBridge', () => {
  it('정상 STEP 1~5는 시작·복귀·완료 안내만 순서대로 전달한다', () => {
    const bridge = new SideKickVoiceBridge()

    const timeline = [
      [0, snapshot(1)],
      [1000, snapshot(2, ['STEP_1_PASS'])],
      [2000, snapshot(3, ['STEP_2_PASS'])],
      [3000, snapshot(4, ['STEP_3_PASS'])],
      [4000, snapshot(5, ['STEP_4_PASS'])],
      [5000, snapshot(null, ['STEP_5_PASS', 'STUDY_COMPLETED'])],
    ] as const

    expect(
      timeline.flatMap(([timestamp, state]) =>
        bridge.update(timestamp, state).map((item) => item.eventCode),
      ),
    ).toEqual([
      'SK_READY_START',
      'SK_LEFT_LIFT_START',
      'SK_LEFT_RETURN',
      'SK_RIGHT_LIFT_START',
      'SK_RIGHT_RETURN',
      'SK_STUDY_COMPLETED',
    ])
  })

  it('STEP 2 PASS 뒤 STEP 3 복귀 안내만 전달한다', () => {
    const bridge = new SideKickVoiceBridge()

    bridge.update(0, snapshot(2))

    expect(
      bridge
        .update(1000, snapshot(3, ['STEP_2_PASS']))
        .map((item) => [item.eventCode, item.step]),
    ).toEqual([['SK_LEFT_RETURN', 3]])
  })

  it('STEP 4 결과와 관계없이 STEP 5 안내만 전달한다', () => {
    const bridge = new SideKickVoiceBridge()

    bridge.update(0, snapshot(4))

    expect(
      bridge
        .update(1000, snapshot(5, ['STEP_4_NON_PASS']))
        .map((item) => item.eventCode),
    ).toEqual(['SK_RIGHT_RETURN'])
  })

  it('복귀 STEP 결과 후에는 다음 동작 시작 안내만 전달한다', () => {
    const bridge = new SideKickVoiceBridge()

    bridge.update(0, snapshot(3))

    expect(
      bridge
        .update(1000, snapshot(4, ['STEP_3_NOT_EVALUATED']))
        .map((item) => item.eventCode),
    ).toEqual(['SK_RIGHT_LIFT_START'])
  })

  it('STEP 1 완료 시 다음 동작 시작을 안내한다', () => {
    const bridge = new SideKickVoiceBridge()

    bridge.update(0, snapshot(1))

    expect(
      bridge
        .update(1000, snapshot(2, ['STEP_1_PASS']))
        .map((item) => item.eventCode),
    ).toEqual(['SK_LEFT_LIFT_START'])
  })

  it('전체 완료 시 최종 안내만 반환한다', () => {
    const bridge = new SideKickVoiceBridge()

    bridge.update(0, snapshot(5))

    expect(
      bridge
        .update(1000, snapshot(null, ['STEP_5_PASS', 'STUDY_COMPLETED']))
        .map((item) => item.eventCode),
    ).toEqual(['SK_STUDY_COMPLETED'])
  })

  it('같은 프레임 이벤트를 중복 처리하지 않는다', () => {
    const bridge = new SideKickVoiceBridge()

    bridge.update(0, snapshot(2))

    const next = snapshot(3, ['STEP_2_PASS'])

    expect(bridge.update(1000, next)).toHaveLength(1)
    expect(bridge.update(1000, next)).toEqual([])
  })

  it('여러 프레임에 남은 STEP 결과만으로 중복 음성을 만들지 않는다', () => {
    const bridge = new SideKickVoiceBridge()
    bridge.update(0, snapshot(2))

    expect(
      bridge
        .update(100, snapshot(3, ['STEP_2_PASS']))
        .map((item) => item.eventCode),
    ).toEqual(['SK_LEFT_RETURN'])
    expect(
      bridge
        .update(200, snapshot(3, ['STEP_2_PASS']))
        .map((item) => item.eventCode),
    ).toEqual([])
  })

  it('reset 이후 새 운동의 안내를 다시 시작한다', () => {
    const bridge = new SideKickVoiceBridge()

    bridge.update(0, snapshot(1))
    bridge.reset()

    expect(bridge.update(0, snapshot(1)).map((item) => item.eventCode)).toEqual(
      ['SK_READY_START'],
    )
  })
})
