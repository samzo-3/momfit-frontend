import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetAuthStore, signIn, signOut } from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

beforeEach(() => {
  resetAuthStore()
})

describe('WorkoutsPage', () => {
  it('로그인하지 않았으면 로그인 화면으로 보낸다', () => {
    signOut()
    const router = renderApp('/workouts')

    expect(router.state.location.pathname).toBe('/login')
  })

  it('먼저 운동 모드와 자세 배우기 중 하나를 고르게 한다', () => {
    signIn()
    renderApp('/workouts')

    expect(
      screen.getByRole('heading', { name: '운동 고르기' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /운동 모드/ })).toHaveAttribute(
      'href',
      '/workouts?mode=exercise',
    )
    expect(screen.getByRole('link', { name: /자세 배우기/ })).toHaveAttribute(
      'href',
      '/workouts?mode=study',
    )
  })

  it('운동 모드를 고르면 운동 목록이 나오고 Side Kick 준비 페이지로 이동한다', async () => {
    signIn()
    const router = renderApp('/workouts')
    const user = userEvent.setup()

    await user.click(screen.getByRole('link', { name: /운동 모드/ }))
    expect(
      screen.getByRole('heading', { name: /운동 모드, 어떤 운동/ }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Side Kick/ }))

    expect(router.state.location.pathname).toBe(
      '/workouts/sidekick/exercise/ready',
    )
  })

  it('자세 배우기를 고르면 Side Kick 준비 페이지로 이동한다', async () => {
    signIn()
    const router = renderApp('/workouts?mode=study')

    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: /Side Kick/ }))

    expect(router.state.location.pathname).toBe(
      '/workouts/sidekick/study/ready',
    )
  })

  it('아직 준비되지 않은 운동은 누를 수 없고 준비 중으로 보인다', () => {
    signIn()
    renderApp('/workouts?mode=exercise')

    expect(screen.getByText('준비 중')).toBeInTheDocument()
    expect(screen.getByText('준비 중인 운동')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /준비 중인 운동/ }),
    ).not.toBeInTheDocument()
  })

  it('다른 모드 보기로 모드 선택으로 돌아간다', async () => {
    signIn()
    const router = renderApp('/workouts?mode=study')

    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: /다른 모드 보기/ }))

    expect(router.state.location.search).toBe('')
    expect(screen.getByRole('link', { name: /운동 모드/ })).toBeInTheDocument()
  })

  it('알 수 없는 모드 값이면 모드 선택을 보여준다', () => {
    signIn()
    renderApp('/workouts?mode=unknown')

    expect(screen.getByRole('link', { name: /운동 모드/ })).toBeInTheDocument()
  })

  it.each(['/workouts', '/workouts?mode=exercise'])(
    '%s 화면에 건강 확인 안내를 보여준다',
    (path) => {
      signIn()
      renderApp(path)

      expect(
        screen.getByText(
          '운동을 시작하기 전에 개인의 건강 상태와 의료진의 운동 제한 권고를 확인해 주세요.',
        ),
      ).toBeInTheDocument()
    },
  )

  it('고른 모드에 맞는 안내 칩과 버튼 문구를 운동 카드에 보여준다', () => {
    signIn()
    renderApp('/workouts?mode=study')

    const card = screen.getByRole('link', { name: /Side Kick/ })
    expect(within(card).getByText('단계별 코칭')).toBeInTheDocument()
    expect(within(card).getByText('자세 배우기 →')).toBeInTheDocument()
  })

  it('홈의 버튼으로 들어올 수 있다', async () => {
    signIn()
    const router = renderApp('/home')

    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: /나에게 맞는 운동 살펴보기/ }))

    expect(router.state.location.pathname).toBe('/workouts')
  })

  it('임시 Side Kick 통합 흐름으로 이동할 수 있다', async () => {
    signIn()
    const router = renderApp('/workouts')

    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: 'Side Kick 시작' }))

    expect(router.state.location.pathname).toBe('/workouts/start')
  })
})
