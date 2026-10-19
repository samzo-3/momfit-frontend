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
    expect(
      nav.queryByRole('link', { name: '시작하기' }),
    ).not.toBeInTheDocument()
  })

  it('로그인했다면 로그인·시작하기 링크 없이 로그아웃만 보여준다', () => {
    signIn()
    renderApp('/home')

    const nav = within(screen.getByRole('navigation', { name: '주요' }))
    expect(nav.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument()
  })

  it('로그인했다면 로그아웃하고 로그인 화면으로 이동한다', async () => {
    signIn()
    mockApi(fetchMock, {
      'POST /api/auth/logout': () => jsonResponse(204),
    })
    const router = renderApp('/home')

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '로그아웃' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(requestsTo(fetchMock, 'POST /api/auth/logout')).toHaveLength(1)
    expect(
      screen.queryByRole('button', { name: '로그아웃' }),
    ).not.toBeInTheDocument()
  })
})
