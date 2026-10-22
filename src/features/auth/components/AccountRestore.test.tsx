import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  errorResponse,
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  userBody,
} from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'
import { setupAuth } from '../auth-session'
import { useAuthStore } from '../store/auth-store'

const fetchMock = vi.fn<typeof fetch>()
const INFO = 'GET /api/auth/restore'
const RESTORE = 'POST /api/auth/restore'
const tokenBody = {
  access_token: 'access-1',
  token_type: 'bearer',
  expires_in: 900,
}
// 낮 12시(UTC)라 어느 시간대에서도 같은 날짜로 보인다.
const infoBody = {
  withdrawn_at: '2026-10-20T12:00:00Z',
  purge_at: '2026-11-19T12:00:00Z',
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  setupAuth()
  useAuthStore.getState().clear() // 세션 복구가 끝난 비로그인 상태
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('탈퇴 계정 복구 화면', () => {
  it('삭제 예정일과 탈퇴일을 보여준다', async () => {
    mockApi(fetchMock, { [INFO]: () => jsonResponse(200, infoBody) })
    renderApp('/account/restore')

    expect(await screen.findByText('2026년 11월 19일')).toBeInTheDocument()
    expect(screen.getByText(/까지 계정을 복구할 수 있어요/)).toBeInTheDocument()
    expect(
      screen.getByText(/2026년 10월 20일에 탈퇴하셨어요/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '탈퇴 처리된 계정이에요' }),
    ).toBeInTheDocument()
  })

  it('복구하면 세션이 시작되고 /home으로 이동한다', async () => {
    mockApi(fetchMock, {
      [INFO]: () => jsonResponse(200, infoBody),
      [RESTORE]: () => jsonResponse(200, tokenBody),
      'GET /api/users/me': () => jsonResponse(200, userBody),
    })
    const router = renderApp('/account/restore')
    await screen.findByText('2026년 11월 19일')

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '계정 복구하기' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(requestsTo(fetchMock, RESTORE)).toHaveLength(1)
  })

  it('복구 중에는 버튼을 잠근다', async () => {
    mockApi(fetchMock, {
      [INFO]: () => jsonResponse(200, infoBody),
      [RESTORE]: () => new Promise<Response>(() => {}),
    })
    renderApp('/account/restore')
    await screen.findByText('2026년 11월 19일')

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '계정 복구하기' }))

    expect(
      await screen.findByRole('button', { name: '복구 중...' }),
    ).toBeDisabled()
  })

  it('복구에 실패하면 안내를 보여주고 다시 시도할 수 있다', async () => {
    mockApi(fetchMock, {
      [INFO]: () => jsonResponse(200, infoBody),
      [RESTORE]: () => errorResponse(401, 'RESTORE_INVALID'),
    })
    renderApp('/account/restore')
    await screen.findByText('2026년 11월 19일')

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '계정 복구하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'RESTORE_INVALID 메시지',
    )
    expect(screen.getByRole('button', { name: '계정 복구하기' })).toBeEnabled()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })

  it('복구하지 않기를 누르면 랜딩으로 간다', async () => {
    mockApi(fetchMock, { [INFO]: () => jsonResponse(200, infoBody) })
    const router = renderApp('/account/restore')
    await screen.findByText('2026년 11월 19일')

    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: '복구하지 않기' }))

    expect(router.state.location.pathname).toBe('/')
  })

  it('복구 요청이 만료됐으면 안내와 로그인 링크만 보여준다', async () => {
    mockApi(fetchMock, {
      [INFO]: () => errorResponse(401, 'RESTORE_INVALID'),
    })
    renderApp('/account/restore')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'RESTORE_INVALID 메시지',
    )
    expect(
      screen.getByRole('link', { name: '로그인으로 돌아가기' }),
    ).toHaveAttribute('href', '/login')
    expect(
      screen.queryByRole('button', { name: '계정 복구하기' }),
    ).not.toBeInTheDocument()
  })

  it('로그인한 사용자는 이 화면 대신 홈으로 보낸다', () => {
    useAuthStore.setState({
      status: 'authenticated',
      accessToken: 'token',
      user: {
        id: 1,
        provider: 'local',
        loginId: 'momfit01',
        nickname: '맘핏',
        email: null,
        dueDate: null,
        pregnancyWeek: null,
        exerciseLevel: null,
        onboardingCompleted: true,
        role: 'user',
      },
    })
    const router = renderApp('/account/restore')

    expect(router.state.location.pathname).toBe('/home')
  })

  it('살구색 화면이다', async () => {
    mockApi(fetchMock, { [INFO]: () => jsonResponse(200, infoBody) })
    renderApp('/account/restore')
    await screen.findByText('2026년 11월 19일')

    expect(screen.getByRole('main')).toHaveClass('bg-primary-soft')
  })
})
