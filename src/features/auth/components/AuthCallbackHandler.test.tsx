import { screen, waitFor } from '@testing-library/react'
import { resetAuthStore, signIn, signOut } from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'
import { useAuthStore } from '../store/auth-store'

beforeEach(() => {
  resetAuthStore()
})

describe('/auth/callback', () => {
  it('세션을 복구하는 동안에는 로딩 화면을 보여주고 이동하지 않는다', () => {
    const router = renderApp('/auth/callback')

    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중')
    expect(router.state.location.pathname).toBe('/auth/callback')
  })

  it('온보딩을 마친 사용자는 /home으로 보낸다', () => {
    signIn({ provider: 'kakao', onboardingCompleted: true })
    const router = renderApp('/auth/callback')

    expect(router.state.location.pathname).toBe('/home')
  })

  it('처음 가입한 카카오 사용자는 /onboarding으로 보낸다', () => {
    signIn({ provider: 'kakao', onboardingCompleted: false })
    const router = renderApp('/auth/callback')

    expect(router.state.location.pathname).toBe('/onboarding')
    expect(
      screen.getByRole('heading', { name: '추가 정보 입력' }),
    ).toBeInTheDocument()
  })

  it('세션을 만들지 못했다면 오류와 함께 로그인 화면으로 보낸다', () => {
    signOut()
    const router = renderApp('/auth/callback')

    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe('?error=provider_error')
    expect(screen.getByRole('alert')).toHaveTextContent(
      '카카오 로그인 중 문제가 생겼어요',
    )
  })

  it('복구가 끝나는 순간 결과에 맞는 화면으로 이동한다', async () => {
    const router = renderApp('/auth/callback')
    expect(router.state.location.pathname).toBe('/auth/callback')

    signIn({ provider: 'kakao', onboardingCompleted: false })

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/onboarding'),
    )
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('로그인 상태가 아니어도 접근할 수 있는 공개 경로다', () => {
    signOut()
    renderApp('/auth/callback')

    // 가드(PublicOnlyRoute 등)에 막혀 /로 튕기지 않고, 이 화면의 처리 결과로만 이동한다.
    expect(
      screen.queryByRole('heading', { level: 1, name: /임신 중에도/ }),
    ).not.toBeInTheDocument()
  })
})
