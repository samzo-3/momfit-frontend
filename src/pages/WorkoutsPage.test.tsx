import { screen } from '@testing-library/react'
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

  it('준비 중 안내를 보여주고 홈으로 돌아갈 수 있다', async () => {
    signIn()
    const router = renderApp('/workouts')

    expect(
      screen.getByRole('heading', { name: '운동 고르기' }),
    ).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('link', { name: '홈으로' }))

    expect(router.state.location.pathname).toBe('/home')
  })

  it('살구색 바탕이고 홈으로 버튼은 대표 색 테두리다', () => {
    signIn()
    renderApp('/workouts')

    expect(screen.getByRole('main')).toHaveClass('bg-primary-soft')
    expect(screen.getByRole('link', { name: '홈으로' })).toHaveClass(
      'border-brand-text',
    )
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
