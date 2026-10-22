import { screen, waitFor } from '@testing-library/react'
import { mockAdminApi } from '../../../test/admin-test-utils'
import { resetAuthStore, signIn, signOut } from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  mockAdminApi(fetchMock)
  resetAuthStore()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RequireAdmin (/admin)', () => {
  it('관리자는 관리자 화면을 본다', async () => {
    signIn({ role: 'admin', nickname: '운영자' })
    const router = renderApp('/admin')

    expect(
      await screen.findByRole('heading', { name: '관리자' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/운영자님/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin')
  })

  it('일반 사용자는 /home으로 보낸다', async () => {
    signIn({ role: 'user' })
    const router = renderApp('/admin')

    expect(await screen.findByRole('heading', { name: '홈' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/home')
    expect(
      screen.queryByRole('heading', { name: '관리자' }),
    ).not.toBeInTheDocument()
  })

  it('로그인하지 않았으면 /login으로 보낸다', async () => {
    signOut()
    const router = renderApp('/admin')

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('세션을 복구하는 동안에는 로딩 화면을 보여준다', async () => {
    const router = renderApp('/admin')

    expect(await screen.findByRole('status')).toHaveTextContent('불러오는 중')
    expect(router.state.location.pathname).toBe('/admin')
  })

  it('온보딩 전 관리자는 /onboarding으로 보낸다', async () => {
    signIn({ role: 'admin', onboardingCompleted: false })
    const router = renderApp('/admin')

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/onboarding'),
    )
  })
})
