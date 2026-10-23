import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetAuthStore, signIn } from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

// 카메라·ONNX 추론은 jsdom에서 돌 수 없으므로, 이동 경로만 확인하도록 훅을 비운다.
const check = vi.hoisted(() => ({
  state: { result: null, holdMs: 0 } as {
    result:
      | import('../features/yolo-environment-check/types').EnvironmentResult
      | null
    holdMs: number
  },
}))
vi.mock('../features/yolo-environment-check/use-environment-check', () => ({
  useEnvironmentCheck: () => check.state,
}))

const person = {
  detectionId: 1,
  classId: 0,
  className: 'person',
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  confidence: 0.9,
}

function mockCamera(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
}

beforeEach(() => {
  check.state = { result: null, holdMs: 0 }
  resetAuthStore()
  signIn()
  mockCamera(() => new Promise(() => {}))
})

describe('SideKickEnvironmentCheckPage 이동 경로', () => {
  it('취소하면 운동 고르기 화면으로 돌아간다', async () => {
    const router = renderApp('/workouts/sidekick/check/study')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '취소' }))

    expect(router.state.location.pathname).toBe('/workouts')
  })

  it('알 수 없는 모드면 운동 고르기 화면으로 보낸다', async () => {
    const router = renderApp('/workouts/sidekick/check/unknown')

    await screen.findByRole('heading', { name: '운동 고르기' })

    expect(router.state.location.pathname).toBe('/workouts')
  })

  it('점검 결과 전에는 각 항목이 확인 중으로 보인다', async () => {
    renderApp('/workouts/sidekick/check/study')

    expect(await screen.findByText('운동 대상자')).toBeInTheDocument()
    expect(screen.getAllByText(/확인 중|전신 인식 후 확인/)).toHaveLength(3)
    expect(screen.getByRole('status')).toHaveTextContent('분석 준비 중')
  })

  it('두 명 이상이면 한 명만 나오게 안내한다', async () => {
    check.state = {
      holdMs: 0,
      result: {
        people: [person, { ...person, detectionId: 2 }],
        poseTracked: true,
        fullBodyValid: false,
        guideAlignment: 'NOT_EVALUABLE',
        inGuide: false,
        ready: false,
        reason: '카메라 안에는 한 명만 있어야 합니다.',
      },
    }
    renderApp('/workouts/sidekick/check/exercise')

    expect(
      await screen.findByText('2명 · 한 명만 나오게 해 주세요'),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      '카메라 안에는 한 명만 있어야 합니다.',
    )
  })

  it('조건을 만족하면 유지 시간을 보여준다', async () => {
    check.state = {
      holdMs: 1200,
      result: {
        people: [person],
        poseTracked: true,
        fullBodyValid: true,
        guideAlignment: 'PASS',
        inGuide: true,
        ready: true,
        reason: '환경 확인 완료. 자세를 유지해 주세요.',
      },
    }
    renderApp('/workouts/sidekick/check/study')

    expect(await screen.findByRole('status')).toHaveTextContent(
      '1.2 / 2초 유지 중',
    )
    expect(screen.getAllByText('정상')).toHaveLength(2)
  })

  it('카메라를 쓸 수 없으면 안내와 다시 시도 버튼을 보여준다', async () => {
    mockCamera(() =>
      Promise.reject(new DOMException('denied', 'NotAllowedError')),
    )
    renderApp('/workouts/sidekick/check/study')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '카메라 권한이 필요합니다.',
    )
    expect(
      screen.getByRole('button', { name: '카메라 다시 시도' }),
    ).toBeInTheDocument()
  })
})
