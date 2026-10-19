import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupAuth } from '../features/auth'
import {
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  signIn,
  signOut,
} from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  setupAuth()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SiteHeader', () => {
  it('로그인하지 않았으면 로그아웃 대신 로그인과 시작하기를 보여준다', () => {
    signOut()
    renderApp('/login')

    expect(screen.getByRole('link', { name: 'MomFit' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(
      screen.queryByRole('button', { name: '로그아웃' }),
    ).not.toBeInTheDocument()
    const nav = within(screen.getByRole('navigation', { name: '주요' }))
    expect(nav.getByRole('link', { name: '로그인' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(nav.getByRole('link', { name: '시작하기' })).toHaveAttribute(
      'href',
      '/signup',
    )
  })

  it('세션을 복구하는 동안에는 오른쪽 버튼을 비워 둔다', () => {
    renderApp('/login')

    const nav = within(screen.getByRole('navigation', { name: '주요' }))
    expect(nav.queryByRole('button')).not.toBeInTheDocument()
    expect(nav.queryByRole('link', { name: '내 정보' })).not.toBeInTheDocument()
    expect(
      nav.queryByRole('link', { name: '시작하기' }),
    ).not.toBeInTheDocument()
  })

  it('로그인했다면 로그인·시작하기 링크 없이 로그아웃만 보여준다', () => {
    signIn()
    renderApp('/home')

    const nav = within(screen.getByRole('navigation', { name: '주요' }))
    expect(nav.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
    expect(nav.getByRole('link', { name: '내 정보' })).toHaveAttribute(
      'href',
      '/me',
    )
    expect(nav.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument()
  })

  describe('로그아웃 확인 모달', () => {
    const headerLogout = () =>
      within(screen.getByRole('navigation', { name: '주요' })).getByRole(
        'button',
        { name: '로그아웃' },
      )

    it('로그아웃 버튼을 누르면 바로 로그아웃하지 않고 확인을 받는다', async () => {
      signIn()
      renderApp('/home')

      await userEvent.setup().click(headerLogout())

      const dialog = screen.getByRole('dialog', { name: '로그아웃하시겠어요?' })
      expect(dialog).toHaveTextContent('이 기기에서 로그아웃합니다.')
      expect(requestsTo(fetchMock, 'POST /api/auth/logout')).toHaveLength(0)
    })

    it('취소하면 로그인 상태를 유지하고 모달을 닫는다', async () => {
      signIn()
      const router = renderApp('/home')
      const user = userEvent.setup()

      await user.click(headerLogout())
      await user.click(screen.getByRole('button', { name: '취소' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(requestsTo(fetchMock, 'POST /api/auth/logout')).toHaveLength(0)
      expect(router.state.location.pathname).toBe('/home')
      expect(headerLogout()).toBeInTheDocument()
    })

    it('Esc로도 취소할 수 있다', async () => {
      signIn()
      renderApp('/home')
      const user = userEvent.setup()

      await user.click(headerLogout())
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(requestsTo(fetchMock, 'POST /api/auth/logout')).toHaveLength(0)
    })

    it('확인하면 로그아웃하고 로그인 화면으로 이동하며 모달을 닫는다', async () => {
      signIn()
      mockApi(fetchMock, {
        'POST /api/auth/logout': () => jsonResponse(204),
      })
      const router = renderApp('/home')
      const user = userEvent.setup()

      await user.click(headerLogout())
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: '로그아웃',
        }),
      )

      await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
      expect(requestsTo(fetchMock, 'POST /api/auth/logout')).toHaveLength(1)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: '로그아웃' }),
      ).not.toBeInTheDocument()
    })

    it('요청 중에는 버튼을 잠그고 닫히지 않는다', async () => {
      signIn()
      let finish: (response: Response) => void = () => {}
      mockApi(fetchMock, {
        'POST /api/auth/logout': () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      })
      renderApp('/home')
      const user = userEvent.setup()

      await user.click(headerLogout())
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: '로그아웃',
        }),
      )

      const dialog = await screen.findByRole('dialog')
      expect(
        within(dialog).getByRole('button', { name: '로그아웃 중...' }),
      ).toBeDisabled()
      expect(
        within(dialog).getByRole('button', { name: '취소' }),
      ).toBeDisabled()
      await user.keyboard('{Escape}')
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      finish(jsonResponse(204))
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      )
    })
  })
})
