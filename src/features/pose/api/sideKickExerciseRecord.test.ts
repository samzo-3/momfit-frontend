import { describe, expect, it, vi } from 'vitest'

const apiRequestMock = vi.hoisted(() => vi.fn())

vi.mock('../../../shared/api/api-client', () => ({
  apiRequest: apiRequestMock,
}))

import { startSideKickExercise } from './sideKickExerciseRecord'

describe('startSideKickExercise', () => {
  it('일반 운동 설정에서 받은 실제 exercise ID를 POST body에 사용한다', async () => {
    apiRequestMock.mockResolvedValueOnce({ id: 51 })

    await startSideKickExercise(91)

    expect(apiRequestMock).toHaveBeenCalledWith('/exercise-records', {
      method: 'POST',
      body: { exercise_id: 91 },
    })
  })

  it('유효하지 않은 ID는 요청 전에 거절한다', () => {
    expect(() => startSideKickExercise(0)).toThrow('INVALID_EXERCISE_ID')
  })
})
