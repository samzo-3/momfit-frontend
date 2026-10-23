import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetAuthStore, signIn } from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

// 카메라·ONNX 추론은 jsdom에서 돌 수 없으므로, 이동 경로만 확인하도록 훅을 비운다.
vi.mock('../features/yolo-environment-check/use-environment-check', () => ({
  useEnvironmentCheck: () => ({ result: null, holdMs: 0 }),
}))

beforeEach(() => {
  resetAuthStore()
  signIn()
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: () => Promise.reject(new Error('no camera in test')),
    },
  })
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
})
