import { screen } from '@testing-library/react'
import { resetAuthStore, signIn, signOut } from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

beforeEach(() => {
  resetAuthStore()
})

describe('WorkoutCompletePage', () => {
  it('로그인하지 않았으면 로그인 화면으로 보낸다', () => {
    signOut()
    const router = renderApp('/workouts/complete', { outcome: 'completed' })

    expect(router.state.location.pathname).toBe('/login')
  })

  it('운동을 마치면 축하 문구와 기록 보기·홈 링크를 보여 준다', () => {
    signIn()
    renderApp('/workouts/complete', { outcome: 'completed' })

    expect(
      screen.getByRole('heading', { name: '오늘의 움직임을 마쳤어요!' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /나의 운동 기록 보기/ }),
    ).toHaveAttribute('href', '/records')
    expect(screen.getByRole('link', { name: '홈으로' })).toHaveAttribute(
      'href',
      '/home',
    )
    expect(screen.getByText(/내 몸의 상태를 존중하는 것이/)).toBeInTheDocument()
  })

  it('자세 배우기를 마치면 STEP 기록 안내 문구를 보여 준다', () => {
    signIn()
    renderApp('/workouts/complete', { outcome: 'completed', mode: 'study' })

    expect(
      screen.getByText(
        '자세 배우기를 마쳤어요. 오늘 익힌 동작을 기록에서 확인해 보세요.',
      ),
    ).toBeInTheDocument()
  })

  it('운동 모드를 마치면 해낸 세트 수를 보여 준다', () => {
    signIn()
    renderApp('/workouts/complete', {
      outcome: 'completed',
      mode: 'exercise',
      completedSets: 7,
    })

    expect(
      screen.getByText('오늘 7세트를 해냈어요. 수고하셨어요.'),
    ).toBeInTheDocument()
  })

  it('운동 모드에서 세트 수가 0이면 기본 문구를 보여 준다', () => {
    signIn()
    renderApp('/workouts/complete', {
      outcome: 'completed',
      mode: 'exercise',
      completedSets: 0,
    })

    expect(
      screen.getByText('수고하셨어요. 오늘의 운동 기록을 확인해 볼까요?'),
    ).toBeInTheDocument()
  })

  it('중간에 나가면 모드와 상관없이 같은 문구를 보여 준다', () => {
    signIn()
    renderApp('/workouts/complete', { outcome: 'stopped', mode: 'study' })

    expect(
      screen.getByRole('heading', { name: '오늘은 여기까지 해요' }),
    ).toBeInTheDocument()
  })

  it('중간에 나간 경우 다른 문구를 보여 준다', () => {
    signIn()
    renderApp('/workouts/complete', { outcome: 'stopped' })

    expect(
      screen.getByRole('heading', { name: '오늘은 여기까지 해요' }),
    ).toBeInTheDocument()
  })

  it('결과 없이 주소로 들어오면 운동 고르기로 보낸다', () => {
    signIn()
    const router = renderApp('/workouts/complete')

    expect(router.state.location.pathname).toBe('/workouts')
  })

  it('기록 보기 링크는 마무리 화면을 기록에 남기지 않는다', async () => {
    signIn()
    const router = renderApp('/workouts/complete', { outcome: 'completed' })
    const { default: userEvent } = await import('@testing-library/user-event')

    await userEvent.click(
      screen.getByRole('link', { name: /나의 운동 기록 보기/ }),
    )

    expect(router.state.location.pathname).toBe('/records')
    expect(router.state.historyAction).toBe('REPLACE')
  })
})
