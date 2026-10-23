import { describe, expect, it, vi } from 'vitest'

const apiRequestMock = vi.hoisted(() => vi.fn())

vi.mock('../../../shared/api/api-client', () => ({
  apiRequest: apiRequestMock,
}))

import { getSideKickExerciseConfig } from './getSideKickExerciseConfig'

describe('getSideKickExerciseConfig', () => {
  it('STEP 기준 버전 없이 일반 운동 설정 경로에서 실제 exercise ID를 읽는다', async () => {
    apiRequestMock.mockResolvedValueOnce({
      exercise_id: 91,
      exercise_name: 'Side Kick',
    })

    await expect(getSideKickExerciseConfig()).resolves.toEqual({
      exercise_id: 91,
      exercise_name: 'Side Kick',
    })
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/exercises/sidekick/exercise-config',
    )
  })

  it('잘못된 응답은 요청 성공으로 취급하지 않는다', async () => {
    apiRequestMock.mockResolvedValueOnce({
      exercise_id: 0,
      exercise_name: 'Side Kick',
    })

    await expect(getSideKickExerciseConfig()).rejects.toThrow(
      'INVALID_SIDEKICK_EXERCISE_CONFIG',
    )
  })
})
