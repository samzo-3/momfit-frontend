import { describe, expect, it, vi } from 'vitest'

const apiRequestMock = vi.hoisted(() => vi.fn())

vi.mock('../../../shared/api/api-client', () => ({
  apiRequest: apiRequestMock,
}))

import {
  buildSideKickStepRecordPayload,
  saveSideKickStep,
  type SideKickStepRecordSaveInput,
} from './saveSideKickStep'

const sessionId = '7d444840-9dc0-4b5b-95bb-55f814ae7af6'

function input(
  outcome: SideKickStepRecordSaveInput['record']['outcome'],
): SideKickStepRecordSaveInput {
  return {
    record: { step: 2, outcome, feedbackCount: 3 },
    exerciseId: 91,
    exerciseStepId: 102,
    exerciseCriteriaVersionId: 301,
    criteriaVersion: '1.0.0',
    stepSessionId: sessionId,
    measurementProfileVersion: 'side_kick_front_2d_runtime_v1',
  }
}

describe('saveSideKickStep payload', () => {
  it.each(['PASS', 'NON_PASS', 'NOT_EVALUATED'] as const)(
    'Runtime %s 결과를 status 없이 최신 API payload로 만든다',
    (outcome) => {
      const payload = buildSideKickStepRecordPayload(input(outcome))

      expect(payload).toMatchObject({
        exercise_id: 91,
        exercise_step_id: 102,
        exercise_criteria_version_id: 301,
        criteria_version: '1.0.0',
        step_session_id: sessionId,
        step_result_status: outcome,
        step_report: {
          criteria_version: '1.0.0',
          evaluation_result: { status: outcome, feedback_count: 3 },
        },
      })
      expect(payload).not.toHaveProperty('status')
      expect(payload).not.toHaveProperty('step_score')
    },
  )

  it('같은 학습 세션 ID를 각 STEP payload에 그대로 사용한다', () => {
    const first = buildSideKickStepRecordPayload(input('PASS'))
    const second = buildSideKickStepRecordPayload({
      ...input('NON_PASS'),
      record: { step: 4, outcome: 'NON_PASS', feedbackCount: 5 },
    })

    expect(first.step_session_id).toBe(second.step_session_id)
  })

  it('API mock에 최신 POST 계약을 전달한다', async () => {
    apiRequestMock.mockResolvedValueOnce({ id: 501 })

    await saveSideKickStep(input('NON_PASS'))

    expect(apiRequestMock).toHaveBeenCalledWith('/exercise-step-records', {
      method: 'POST',
      body: buildSideKickStepRecordPayload(input('NON_PASS')),
    })
  })

  it('ID, version, session ID가 유효하지 않으면 POST 전에 차단한다', () => {
    expect(() =>
      buildSideKickStepRecordPayload({ ...input('PASS'), criteriaVersion: '' }),
    ).toThrow('INVALID_CRITERIA_VERSION')
    expect(() =>
      buildSideKickStepRecordPayload({
        ...input('PASS'),
        stepSessionId: 'not-a-uuid',
      }),
    ).toThrow('INVALID_STEP_SESSION_ID')
  })
})
