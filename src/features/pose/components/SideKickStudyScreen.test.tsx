import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PoseFrame } from '../mediapipe/usePoseLandmarker'

const getConfigMock = vi.hoisted(() => vi.fn())
const matchesVersionMock = vi.hoisted(() => vi.fn())
const saveStepMock = vi.hoisted(() => vi.fn())
const onFrame = vi.hoisted(() => ({
  current: null as ((frame: PoseFrame) => void) | null,
}))
const snapshot = vi.hoisted(() => ({
  current: {
    flow: {
      step: 1,
      completed: false,
      finalResult: null,
      records: [] as Array<{
        step: 1 | 2 | 3 | 4 | 5
        outcome: 'PASS' | 'NON_PASS' | 'NOT_EVALUATED'
        feedbackCount: number
      }>,
      events: [] as string[],
      feedbackCount: 0,
    },
    baseline: null,
    readySampleCount: 0,
    lift: null,
    returning: null,
  },
}))
const resetMock = vi.hoisted(() => vi.fn())
const runtimeUpdateMock = vi.hoisted(() => vi.fn())

vi.mock('../mediapipe/usePoseLandmarker', () => ({
  usePoseLandmarker: (
    _video: unknown,
    _canvas: unknown,
    _ready: boolean,
    callback: (frame: PoseFrame) => void,
  ) => {
    onFrame.current = callback
    return { status: 'ready', landmarkCount: 33, error: null }
  },
}))

vi.mock('../api/getSideKickStudyConfig', () => ({
  getSideKickStudyConfig: getConfigMock,
  matchesSideKickRuntimeCriteriaVersion: matchesVersionMock,
}))

vi.mock('../api/saveSideKickStep', () => ({ saveSideKickStep: saveStepMock }))

vi.mock('../analyzers/sideKick/side-kick-study-runtime', () => ({
  SIDE_KICK_RUNTIME_CRITERIA: {
    criteriaVersion: '1.0.0',
    measurementProfileVersion: 'side_kick_front_2d_runtime_v1',
  },
  SideKickStudyRuntime: class {
    update(...args: unknown[]) {
      runtimeUpdateMock(...args)
      return snapshot.current
    }
    reset() {
      resetMock()
    }
  },
}))

vi.mock('../analyzers/sideKick/side-kick-study-score', () => ({
  scoreSideKickStep: () => ({ judgment: { status: 'EVALUATED', score: 100 } }),
}))

import { SideKickStudyScreen } from './SideKickStudyScreen'

const config = {
  exercise_id: 91,
  exercise_criteria_version_id: 301,
  criteria_version: '1.0.0',
  steps: [1, 2, 3, 4, 5].map((step_no) => ({
    step_no,
    exercise_step_id: 100 + step_no,
    step_name: `STEP ${step_no}`,
  })),
}

function poseFrame(timestampMs: number): PoseFrame {
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 1,
    presence: 1,
  }))
  return { timestampMs, landmarks, worldLandmarks: landmarks }
}

function recordSnapshot(step: number, recordStep: number) {
  snapshot.current = {
    ...snapshot.current,
    flow: {
      step: step as 1 | 2 | 3 | 4 | 5,
      completed: false,
      finalResult: null,
      records: [
        {
          step: recordStep as 1 | 2 | 3 | 4 | 5,
          outcome: 'PASS',
          feedbackCount: 0,
        },
      ],
      events: [`STEP_${recordStep}_PASS`],
      feedbackCount: 0,
    },
  }
}

describe('SideKickStudyScreen runtime wiring', () => {
  beforeEach(() => {
    runtimeUpdateMock.mockReset()
    window.history.pushState({}, '', '/workouts/sidekick/study')
    getConfigMock.mockResolvedValue(config)
    matchesVersionMock.mockReturnValue(true)
    saveStepMock.mockResolvedValue({ id: 1 })
    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('session-1')
        .mockReturnValueOnce('session-2'),
    })
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      },
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    snapshot.current = {
      flow: {
        step: 1,
        completed: false,
        finalResult: null,
        records: [],
        events: [],
        feedbackCount: 0,
      },
      baseline: null,
      readySampleCount: 0,
      lift: null,
      returning: null,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('criteria version 불일치면 STEP 결과를 저장하지 않고 안내한다', async () => {
    matchesVersionMock.mockReturnValue(false)
    render(<SideKickStudyScreen />)

    expect(
      await screen.findByText(
        /criteria_version 식별자가 없어 STEP 기록을 저장하지 않습니다/,
      ),
    ).toBeInTheDocument()
    recordSnapshot(2, 1)
    await act(async () => onFrame.current?.(poseFrame(1)))

    expect(saveStepMock).not.toHaveBeenCalled()
    expect(screen.getByText(/기록을 저장하지 않았습니다/)).toBeInTheDocument()
  })

  it('STEP 전환은 세션 UUID를 유지하고 재시작은 새 UUID를 사용한다', async () => {
    render(<SideKickStudyScreen />)
    await waitFor(() => expect(onFrame.current).not.toBeNull())

    recordSnapshot(2, 1)
    await act(async () => onFrame.current?.(poseFrame(1)))
    recordSnapshot(3, 2)
    await act(async () => onFrame.current?.(poseFrame(2)))
    await waitFor(() => expect(saveStepMock).toHaveBeenCalledTimes(2))
    expect(saveStepMock.mock.calls[0][0].stepSessionId).toBe('session-1')
    expect(saveStepMock.mock.calls[1][0].stepSessionId).toBe('session-1')

    fireEvent.click(
      screen.getByRole('button', { name: '학습 처음부터 다시 시작' }),
    )
    recordSnapshot(2, 1)
    await act(async () => onFrame.current?.(poseFrame(3)))
    await waitFor(() => expect(saveStepMock).toHaveBeenCalledTimes(3))
    expect(saveStepMock.mock.calls[2][0].stepSessionId).toBe('session-2')
  })

  it('저장 API 실패를 사용자에게 알리고 STEP 2 영상은 0.65배속으로 전환한다', async () => {
    saveStepMock.mockRejectedValueOnce(new Error('network'))
    const { container } = render(<SideKickStudyScreen />)
    await waitFor(() => expect(onFrame.current).not.toBeNull())

    recordSnapshot(2, 1)
    await act(async () => onFrame.current?.(poseFrame(1)))

    expect(
      await screen.findByText(
        'STEP 기록을 저장하지 못했습니다. 판정 결과는 유지됩니다.',
      ),
    ).toBeInTheDocument()
    const trainer = container.querySelector(
      'video[src="/videos/sidekick/step2.mp4"]',
    ) as HTMLVideoElement
    expect(trainer).not.toBeNull()
    expect(trainer.playbackRate).toBe(0.65)
  })

  it('개발 화면도 신규 Runtime 상태를 표시한다', () => {
    window.history.pushState({}, '', '/dev/sidekick/study')
    render(<SideKickStudyScreen />)
    expect(screen.getByText('실시간 STEP 테스트')).toBeInTheDocument()
    expect(screen.getByText(/신규 STEP 음성 코칭/)).toBeInTheDocument()
  })

  it('frontend_only 모드는 설정 조회나 STEP 저장 없이 JSON Runtime을 실행한다', async () => {
    vi.stubEnv('VITE_SIDEKICK_STUDY_MODE', 'frontend_only')
    getConfigMock.mockRejectedValue(new Error('API should not be called'))
    recordSnapshot(2, 1)

    render(<SideKickStudyScreen />)
    await waitFor(() => expect(onFrame.current).not.toBeNull())
    await act(async () => onFrame.current?.(poseFrame(1)))

    expect(getConfigMock).not.toHaveBeenCalled()
    expect(runtimeUpdateMock).toHaveBeenCalledOnce()
    expect(saveStepMock).not.toHaveBeenCalled()
    expect(
      screen.getByText('체험 모드 · 운동 기록은 저장되지 않습니다.'),
    ).toBeInTheDocument()
  })

  it('개발 화면은 STEP 1 음성을 자동 재생한 뒤 활성화 상태를 표시한다', async () => {
    window.history.pushState({}, '', '/dev/sidekick/study')
    render(<SideKickStudyScreen />)

    expect(
      await screen.findByRole('button', { name: '테스트 음성 끄기' }),
    ).toBeInTheDocument()
  })

  it('사용자 음성 켜기는 신규 Player의 현재 STEP 안내를 재생한다', async () => {
    render(<SideKickStudyScreen />)

    const button = await screen.findByRole('button', { name: '음성 켜기' })
    fireEvent.click(button)

    expect(
      await screen.findByText('음성 안내가 켜졌습니다.'),
    ).toBeInTheDocument()
    expect(button).toBeDisabled()
  })
})
