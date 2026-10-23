import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getConfigMock = vi.hoisted(() => vi.fn())
const startExerciseMock = vi.hoisted(() => vi.fn())
const pauseExerciseMock = vi.hoisted(() => vi.fn())
const resumeExerciseMock = vi.hoisted(() => vi.fn())
const completeExerciseMock = vi.hoisted(() => vi.fn())

vi.mock('../mediapipe/usePoseLandmarker', () => ({
  usePoseLandmarker: () => ({ status: 'ready', error: null }),
}))

vi.mock('../api/getSideKickExerciseConfig', () => ({
  getSideKickExerciseConfig: getConfigMock,
}))

vi.mock('../api/sideKickExerciseRecord', () => ({
  startSideKickExercise: startExerciseMock,
  pauseSideKickExercise: pauseExerciseMock,
  resumeSideKickExercise: resumeExerciseMock,
  completeSideKickExercise: completeExerciseMock,
}))

import SideKickExerciseScreen from './SideKickExerciseScreen'

function trainer(container: HTMLElement): HTMLVideoElement {
  const video = container.querySelector('video')
  if (!video) throw new Error('TRAINER_VIDEO_NOT_FOUND')
  return video
}

describe('SideKickExerciseScreen frontend-only mode', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SIDEKICK_EXERCISE_MODE', 'frontend_only')
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      },
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('GUIDE 종료 뒤 API 요청 없이 EXERCISE로 전환하고 로컬 pause/resume을 처리한다', async () => {
    const { container, getByRole, getByText } = render(
      <SideKickExerciseScreen />,
    )

    expect(
      getByText('체험 모드 · 운동 기록은 저장되지 않습니다.'),
    ).toBeInTheDocument()

    fireEvent.ended(trainer(container))
    await waitFor(() =>
      expect(trainer(container).src).toContain(
        '/videos/sidekick/exercise-10sets.mp4',
      ),
    )

    fireEvent.click(getByRole('button', { name: '수동 일시 정지' }))
    await waitFor(() =>
      expect(getByRole('button', { name: '이어하기' })).toBeEnabled(),
    )
    fireEvent.click(getByRole('button', { name: '이어하기' }))
    await waitFor(() =>
      expect(getByRole('button', { name: '수동 일시 정지' })).toBeEnabled(),
    )

    expect(getConfigMock).not.toHaveBeenCalled()
    expect(startExerciseMock).not.toHaveBeenCalled()
    expect(pauseExerciseMock).not.toHaveBeenCalled()
    expect(resumeExerciseMock).not.toHaveBeenCalled()
    expect(completeExerciseMock).not.toHaveBeenCalled()
  })

  it('운동 영상 종료 후 API 요청 없이 DONE 화면으로 전환한다', async () => {
    vi.useFakeTimers()
    const { container, getByText } = render(<SideKickExerciseScreen />)

    fireEvent.ended(trainer(container))
    await act(async () => {
      await Promise.resolve()
    })
    fireEvent.ended(trainer(container))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(getByText(/운동 종료: 0세트 완료/)).toBeInTheDocument()
    expect(
      getByText(/체험 모드에서는 운동 기록을 저장하지 않았습니다/),
    ).toBeInTheDocument()
    expect(getConfigMock).not.toHaveBeenCalled()
    expect(startExerciseMock).not.toHaveBeenCalled()
    expect(pauseExerciseMock).not.toHaveBeenCalled()
    expect(resumeExerciseMock).not.toHaveBeenCalled()
    expect(completeExerciseMock).not.toHaveBeenCalled()
  })
})
