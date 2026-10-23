import { fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const getConfigMock = vi.hoisted(() => vi.fn())
const startExerciseMock = vi.hoisted(() => vi.fn())

vi.mock('../mediapipe/usePoseLandmarker', () => ({
  usePoseLandmarker: () => ({ status: 'ready', error: null }),
}))

vi.mock('../api/getSideKickExerciseConfig', () => ({
  getSideKickExerciseConfig: getConfigMock,
}))

vi.mock('../api/sideKickExerciseRecord', () => ({
  startSideKickExercise: startExerciseMock,
  pauseSideKickExercise: vi.fn(),
  resumeSideKickExercise: vi.fn(),
  completeSideKickExercise: vi.fn(),
}))

import SideKickExerciseScreen from './SideKickExerciseScreen'

function trainer(container: HTMLElement): HTMLVideoElement {
  const video = container.querySelector('video')
  if (!video) throw new Error('TRAINER_VIDEO_NOT_FOUND')
  return video
}

describe('SideKickExerciseScreen trainer mute', () => {
  beforeEach(() => {
    getConfigMock.mockResolvedValue({ exercise_id: 1 })
    startExerciseMock.mockResolvedValue({ id: 10, total_score: '0.00' })
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      },
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('GUIDE와 EXERCISE source 교체 뒤에도 트레이너 DOM을 음소거한다', async () => {
    const { container } = render(
      <MemoryRouter>
        <SideKickExerciseScreen />
      </MemoryRouter>,
    )
    const guide = trainer(container)

    expect(guide.src).toContain('/videos/sidekick/guide.mp4')
    expect(guide).toMatchObject({ muted: true, defaultMuted: true })

    fireEvent.ended(guide)
    await waitFor(() =>
      expect(trainer(container).src).toContain(
        '/videos/sidekick/exercise-10sets.mp4',
      ),
    )

    const exercise = trainer(container)
    expect(exercise).toMatchObject({ muted: true, defaultMuted: true })
    fireEvent.canPlay(exercise)
    await waitFor(() =>
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalled(),
    )
    expect(exercise.muted).toBe(true)
  })

  it('사용자 재생 버튼도 muted=true 상태에서 재생한다', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValueOnce(new Error('autoplay blocked'))
      .mockResolvedValue(undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { container, getByRole } = render(
      <MemoryRouter>
        <SideKickExerciseScreen />
      </MemoryRouter>,
    )
    const guide = trainer(container)

    fireEvent.canPlay(guide)
    const retry = await waitFor(() =>
      getByRole('button', { name: '영상 재생' }),
    )
    const callsBeforeRetry = play.mock.calls.length
    fireEvent.click(retry)

    await waitFor(() =>
      expect(play.mock.calls.length).toBeGreaterThan(callsBeforeRetry),
    )
    expect(guide).toMatchObject({ muted: true, defaultMuted: true })
  })

  it('나가기를 누르면 확인 창을 띄우고 계속하기로 닫을 수 있다', async () => {
    const { getByRole, findByText, queryByText } = render(
      <MemoryRouter>
        <SideKickExerciseScreen />
      </MemoryRouter>,
    )

    fireEvent.click(getByRole('button', { name: '나가기' }))
    expect(await findByText('운동을 그만할까요?')).toBeInTheDocument()

    fireEvent.click(getByRole('button', { name: '계속하기' }))
    await waitFor(() =>
      expect(queryByText('운동을 그만할까요?')).not.toBeInTheDocument(),
    )
  })
})
