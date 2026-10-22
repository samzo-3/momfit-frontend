import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetAuthStore, signIn, signOut } from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

beforeEach(() => {
  resetAuthStore()
})

const goButton = () =>
  screen.getByRole('button', { name: /운동 화면으로 이동/ })

describe('WorkoutReadyPage', () => {
  it('로그인하지 않았으면 로그인 화면으로 보낸다', () => {
    signOut()
    const router = renderApp('/workouts/sidekick/exercise/ready')

    expect(router.state.location.pathname).toBe('/login')
  })

  it('준비사항과 건강 안내를 보여주고 처음에는 이동할 수 없다', () => {
    signIn()
    renderApp('/workouts/sidekick/exercise/ready')

    expect(
      screen.getByRole('heading', { name: '운동 환경을 준비해 볼까요?' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
    expect(screen.getByRole('status')).toHaveTextContent('체크 완료 0/4')
    expect(goButton()).toBeDisabled()
    expect(
      screen.getByText(/개인의 건강 상태와 의료진의 운동 제한 권고/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/다음 화면에서 카메라 권한을 요청해요/),
    ).toBeVisible()
  })

  it('모든 항목을 체크해야 이동할 수 있고, 이동하면 운동 화면이 열린다', async () => {
    signIn()
    const router = renderApp('/workouts/sidekick/exercise/ready')
    const user = userEvent.setup()

    const boxes = screen.getAllByRole('checkbox')
    for (const box of boxes.slice(0, 3)) await user.click(box)
    expect(screen.getByRole('status')).toHaveTextContent('체크 완료 3/4')
    expect(goButton()).toBeDisabled()

    await user.click(boxes[3])
    expect(screen.getByRole('status')).toHaveTextContent('체크 완료 4/4')
    await user.click(goButton())

    expect(router.state.location.pathname).toBe('/workouts/sidekick/exercise')
  })

  it('이동 안내 문구는 체크를 마치면 숨기기만 해서 카드 높이가 변하지 않는다', async () => {
    signIn()
    renderApp('/workouts/sidekick/exercise/ready')
    const hint = screen.getByText('모든 항목을 체크하면 이동할 수 있어요.')
    expect(hint).not.toHaveClass('invisible')

    for (const box of screen.getAllByRole('checkbox'))
      await userEvent.setup().click(box)

    // 지우면 높이가 줄어드므로 DOM에는 남기고 invisible로 자리만 유지한다.
    expect(hint).toBeInTheDocument()
    expect(hint).toHaveClass('invisible')
    expect(goButton()).not.toHaveAttribute('aria-describedby')
  })

  it('체크를 해제하면 다시 이동할 수 없다', async () => {
    signIn()
    renderApp('/workouts/sidekick/exercise/ready')
    const user = userEvent.setup()

    for (const box of screen.getAllByRole('checkbox')) await user.click(box)
    expect(goButton()).toBeEnabled()
    await user.click(screen.getAllByRole('checkbox')[0])

    expect(goButton()).toBeDisabled()
  })

  it('자세 배우기는 소리 안내 항목이 있고 자세 배우기 화면으로 이동한다', async () => {
    signIn()
    const router = renderApp('/workouts/sidekick/study/ready')
    const user = userEvent.setup()

    expect(screen.getByLabelText(/기기 소리를 켰어요/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/온몸이 보이도록/)).not.toBeInTheDocument()
    for (const box of screen.getAllByRole('checkbox')) await user.click(box)
    await user.click(goButton())

    expect(router.state.location.pathname).toBe('/workouts/sidekick/study')
  })

  it('운동 고르기 링크는 들어온 모드의 목록으로 돌려보낸다', async () => {
    signIn()
    const router = renderApp('/workouts/sidekick/study/ready')

    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: /운동 고르기/ }))

    expect(router.state.location.pathname).toBe('/workouts')
    expect(router.state.location.search).toBe('?mode=study')
  })

  it.each([
    '/workouts/unknown/exercise/ready',
    '/workouts/sidekick/unknown/ready',
    '/workouts/coming-soon/exercise/ready',
  ])('알 수 없거나 준비 중인 운동·모드(%s)면 운동 고르기로 보낸다', (path) => {
    signIn()
    const router = renderApp(path)

    expect(router.state.location.pathname).toBe('/workouts')
  })

  it('준비 페이지에도 화면 전환 애니메이션 래퍼가 적용된다', () => {
    signIn()
    renderApp('/workouts/sidekick/exercise/ready')

    expect(
      document.querySelector('[data-page-transition]')?.querySelector('h1'),
    ).toHaveTextContent('운동 환경을 준비해 볼까요?')
  })
})
