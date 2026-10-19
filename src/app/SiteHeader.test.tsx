import { screen, waitFor } from '@testing-library/react'
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
  it('로그인하지 않았으면 로그아웃 버튼 없이 서비스 이름만 보여준다', () => {
    signOut()
    renderApp('/login')

    expect(screen.getByRole('link', { name: '맘핏' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(
      screen.queryByRole('button', { name: '로그아웃' }),
    ).not.toBeInTheDocument()
  })

  it('세션을 복구하는 동안에는 로그아웃 버튼을 보여주지 않는다', () => {
    renderApp('/login')

    expect(
      screen.queryByRole('button', { name: '로그아웃' }),
    ).not.toBeInTheDocument()
  })

  it('로그인했다면 로그아웃하고 로그인 화면으로 이동한다', async () => {
    signIn()
    mockApi(fetchMock, {
      'POST /api/auth/logout': () => jsonResponse(204),
    })
    const router = renderApp('/')

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
