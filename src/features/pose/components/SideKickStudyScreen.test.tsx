import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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

function CompleteProbe() {
  const { state } = useLocation()
  return <p>마무리:{(state as { outcome: string }).outcome}</p>
}

function renderStudy(path = '/workouts/sidekick/study') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<SideKickStudyScreen />} />
        <Route path="/workouts/complete" element={<CompleteProbe />} />
        <Route path="/dev/sidekick/start" element={<p>개발 시작</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

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

  it('criteria version 불일치면 STEP 결과를 저장하지 않지만 통과 여부는 보여 준다', async () => {
    matchesVersionMock.mockReturnValue(false)
    renderStudy()
    await waitFor(() => expect(onFrame.current).not.toBeNull())
    await waitFor(() => expect(getConfigMock).toHaveBeenCalled())
    await act(async () => {})

    recordSnapshot(2, 1)
    await act(async () => onFrame.current?.(poseFrame(1)))

    expect(saveStepMock).not.toHaveBeenCalled()
    expect(await screen.findByText('STEP 1 통과했어요!')).toBeInTheDocument()
  })

  it('DB 설정을 받지 못해도(409 등) 판정은 진행하고 저장만 하지 않는다', async () => {
    getConfigMock.mockRejectedValue(
      new Error('SIDEKICK_EXERCISE_NOT_CONFIGURED'),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderStudy()
    await waitFor(() => expect(onFrame.current).not.toBeNull())
    await waitFor(() => expect(getConfigMock).toHaveBeenCalled())

    recordSnapshot(2, 1)
    await act(async () => onFrame.current?.(poseFrame(1)))

    expect(await screen.findByText(/STEP 2\/5/)).toBeInTheDocument()
    expect(screen.getByText('STEP 1 통과했어요!')).toBeInTheDocument()
    expect(saveStepMock).not.toHaveBeenCalled()
  })

  it('미통과·인식 불가 STEP도 안내하고, STEP 결과 점에 반영한다', async () => {
    renderStudy()
    await waitFor(() => expect(onFrame.current).not.toBeNull())

    snapshot.current = {
      ...snapshot.current,
      flow: {
        step: 3,
        completed: false,
        finalResult: null,
        records: [
          { step: 1, outcome: 'PASS', feedbackCount: 0 },
          { step: 2, outcome: 'NON_PASS', feedbackCount: 1 },
        ],
        events: [],
        feedbackCount: 1,
      },
    }
    await act(async () => onFrame.current?.(poseFrame(1)))

    expect(await screen.findByText(/STEP 2 아쉬워요/)).toBeInTheDocument()
    expect(screen.getByLabelText('STEP 1 통과')).toBeInTheDocument()
    expect(screen.getByLabelText('STEP 2 다시 도전')).toBeInTheDocument()
    expect(screen.getByLabelText('STEP 3 진행 전')).toBeInTheDocument()
  })

  it('STEP 전환은 세션 UUID를 유지하고 완료 후 재시작은 새 UUID를 사용한다', async () => {
    renderStudy()
    await waitFor(() => expect(onFrame.current).not.toBeNull())

    recordSnapshot(2, 1)
    await act(async () => onFrame.current?.(poseFrame(1)))
    recordSnapshot(3, 2)
    await act(async () => onFrame.current?.(poseFrame(2)))
    await waitFor(() => expect(saveStepMock).toHaveBeenCalledTimes(2))
    expect(saveStepMock.mock.calls[0][0].stepSessionId).toBe('session-1')
    expect(saveStepMock.mock.calls[1][0].stepSessionId).toBe('session-1')

    snapshot.current = {
      ...snapshot.current,
      flow: {
        step: null as unknown as number,
        completed: true,
        finalResult: 'PASS' as never,
        records: [
          { step: 1, outcome: 'PASS', feedbackCount: 0 },
          { step: 2, outcome: 'PASS', feedbackCount: 0 },
        ],
        events: [],
        feedbackCount: 0,
      },
    }
    await act(async () => onFrame.current?.(poseFrame(3)))
    fireEvent.click(
      await screen.findByRole('button', { name: '학습 처음부터 다시 시작' }),
    )
    expect(resetMock).toHaveBeenCalled()
    recordSnapshot(2, 1)
    await act(async () => onFrame.current?.(poseFrame(4)))
    await waitFor(() => expect(saveStepMock).toHaveBeenCalledTimes(3))
    expect(saveStepMock.mock.calls[2][0].stepSessionId).toBe('session-2')
  })

  it('저장 API 실패는 콘솔에 남기고 STEP 2 영상은 0.65배속으로 전환한다', async () => {
    saveStepMock.mockRejectedValueOnce(new Error('network'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderStudy()
    await waitFor(() => expect(onFrame.current).not.toBeNull())

    recordSnapshot(2, 1)
    await act(async () => onFrame.current?.(poseFrame(1)))

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        'STEP DB SAVE FAILED:',
        1,
        expect.any(Error),
      ),
    )
    const trainer = container.querySelector(
      'video[src="/videos/sidekick/step2.mp4"]',
    ) as HTMLVideoElement
    expect(trainer).not.toBeNull()
    expect(trainer.playbackRate).toBe(0.65)
  })

  it('개발 화면도 신규 Runtime 상태를 표시한다', () => {
    window.history.pushState({}, '', '/dev/sidekick/study')
    renderStudy()
    expect(screen.getByText('실시간 STEP 테스트')).toBeInTheDocument()
    expect(screen.getByText(/신규 STEP 음성 코칭/)).toBeInTheDocument()
  })

  it('frontend_only 모드는 설정 조회나 STEP 저장 없이 JSON Runtime을 실행한다', async () => {
    vi.stubEnv('VITE_SIDEKICK_STUDY_MODE', 'frontend_only')
    getConfigMock.mockRejectedValue(new Error('API should not be called'))
    recordSnapshot(2, 1)

    renderStudy()
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
    renderStudy()

    expect(
      await screen.findByRole('button', { name: '테스트 음성 끄기' }),
    ).toBeInTheDocument()
  })

  it('사용자 화면도 진입하면 STEP 1 음성을 자동 재생하고 켜진 상태를 표시한다', async () => {
    renderStudy()

    expect(
      await screen.findByText('음성 안내가 켜졌습니다.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '음성 켜기' }),
    ).not.toBeInTheDocument()
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })

  it('사용자 화면에서 자동 재생이 차단되면 안내하고 버튼으로 음성을 켠다', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
    play.mockRejectedValueOnce(new Error('NotAllowedError'))
    renderStudy()

    expect(
      await screen.findByText(/자동 음성 재생이 차단됐습니다/),
    ).toBeInTheDocument()

    const button = screen.getByRole('button', { name: '음성 켜기' })
    expect(button).toBeEnabled()
    fireEvent.click(button)

    expect(
      await screen.findByText('음성 안내가 켜졌습니다.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '음성 켜기' }),
    ).not.toBeInTheDocument()
  })
  it('전체 화면 버튼은 문서 전체에 브라우저 전체 화면을 요청한다', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })
    renderStudy()

    fireEvent.click(await screen.findByRole('button', { name: '전체 화면' }))

    expect(requestFullscreen).toHaveBeenCalledTimes(1)
    expect(requestFullscreen.mock.contexts[0]).toBe(document.documentElement)
    delete (HTMLElement.prototype as { requestFullscreen?: unknown })
      .requestFullscreen
  })

  it('사용자 화면은 전체 화면 여부와 상관없이 화면을 꽉 채워 보여 준다', async () => {
    const { container } = renderStudy()
    await screen.findByRole('button', { name: '전체 화면' })

    const stage = container.querySelector('.fixed.inset-0')
    expect(stage).not.toBeNull()
    expect(
      stage?.querySelector('video[src^="/videos/sidekick/step"]'),
    ).not.toBeNull()
  })

  it('나가기는 확인 후 마무리 화면(중단)으로 보낸다', async () => {
    renderStudy()

    fireEvent.click(await screen.findByRole('button', { name: '나가기' }))
    expect(await screen.findByText('운동을 그만할까요?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }))
    await waitFor(() =>
      expect(screen.queryByText('운동을 그만할까요?')).not.toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: '나가기' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '나가기' }))

    expect(await screen.findByText('마무리:stopped')).toBeInTheDocument()
  })

  it('학습을 모두 마치면 운동 나가기가 처음부터 다시 시작 위에 나오고 완료로 보낸다', async () => {
    renderStudy()
    await waitFor(() => expect(onFrame.current).not.toBeNull())

    snapshot.current = {
      ...snapshot.current,
      flow: {
        step: null as unknown as number,
        completed: true,
        finalResult: 'PASS' as never,
        records: [{ step: 1, outcome: 'PASS', feedbackCount: 0 }],
        events: [],
        feedbackCount: 0,
      },
    }
    await act(async () => onFrame.current?.(poseFrame(1)))

    const exit = await screen.findByRole('button', { name: '운동 나가기' })
    const restart = screen.getByRole('button', {
      name: '학습 처음부터 다시 시작',
    })
    expect(
      exit.compareDocumentPosition(restart) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    fireEvent.click(exit)
    expect(await screen.findByText('마무리:completed')).toBeInTheDocument()
  })
})
