import { screen, waitFor } from '@testing-library/react'
import { mockAdminApi } from '../../../test/admin-test-utils'
import { resetAuthStore, signIn } from '../../../test/auth-test-utils'
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

describe('RequireMember (관리자의 회원용 화면 접근)', () => {
  it.each(['/home', '/records', '/me', '/workouts'])(
    '관리자가 %s에 들어가면 /admin으로 보낸다',
    async (path) => {
      signIn({ role: 'admin' })
      const router = renderApp(path)

      await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
      expect(
        await screen.findByRole('heading', { name: '관리자' }),
      ).toBeInTheDocument()
    },
  )

  it('관리자가 로그인한 상태로 /login에 오면 /admin으로 간다', async () => {
    signIn({ role: 'admin' })
    const router = renderApp('/login')

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })

  it('일반 사용자는 /home, /me를 그대로 본다', () => {
    signIn({ role: 'user' })
    const router = renderApp('/home')

    expect(router.state.location.pathname).toBe('/home')
    expect(screen.getByRole('heading', { name: '홈' })).toBeInTheDocument()
  })
})
