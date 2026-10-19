import { apiRequest } from '../../shared/api'
import {
  errorResponse,
  jsonResponse,
  resetAuthStore,
  userBody,
} from '../../test/auth-test-utils'
import {
  initializeAuth,
  loadSession,
  logout,
  setupAuth,
  startSession,
} from './auth-session'
import { useAuthStore } from './store/auth-store'

const fetchMock = vi.fn<typeof fetch>()

function tokenBody(token: string) {
  return { access_token: token, token_type: 'bearer', expires_in: 900 }
}

function urlOf(callIndex: number) {
  return fetchMock.mock.calls[callIndex][0]
}

function authHeaderOf(callIndex: number) {
  return new Headers(fetchMock.mock.calls[callIndex][1]?.headers).get(
    'Authorization',
  )
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  setupAuth()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('initializeAuth', () => {
  it('refresh 후 사용자 정보를 불러와 로그인 상태로 만든다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, tokenBody('access-1')))
      .mockResolvedValueOnce(jsonResponse(200, userBody))

    await initializeAuth()

    const state = useAuthStore.getState()
    expect(state.status).toBe('authenticated')
    expect(state.accessToken).toBe('access-1')
    expect(state.user).toMatchObject({
      nickname: '맘핏',
      loginId: 'momfit01',
      pregnancyWeek: 28,
      onboardingCompleted: true,
    })
    expect(urlOf(0)).toBe('/api/auth/refresh')
    expect(urlOf(1)).toBe('/api/users/me')
    expect(authHeaderOf(0)).toBeNull()
    expect(authHeaderOf(1)).toBe('Bearer access-1')
  })

  it('refresh 쿠키가 없거나 폐기되었으면 비로그인 상태가 된다', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'REFRESH_INVALID'))

    await initializeAuth()

    const state = useAuthStore.getState()
    expect(state.status).toBe('unauthenticated')
    expect(state.accessToken).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('네트워크 오류여도 비로그인 상태로 끝난다', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await initializeAuth()

    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })

  it('사용자 조회가 실패하면 토큰을 버리고 비로그인 상태가 된다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, tokenBody('access-1')))
      .mockResolvedValueOnce(errorResponse(500, 'INTERNAL'))

    await initializeAuth()

    const state = useAuthStore.getState()
    expect(state.status).toBe('unauthenticated')
    expect(state.accessToken).toBeNull()
    expect(state.user).toBeNull()
  })

  it('동시에 여러 번 호출해도 refresh는 한 번만 보낸다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, tokenBody('access-1')))
      .mockResolvedValueOnce(jsonResponse(200, userBody))

    await Promise.all([initializeAuth(), initializeAuth()])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(urlOf(0)).toBe('/api/auth/refresh')
    expect(urlOf(1)).toBe('/api/users/me')
  })
})

describe('startSession / loadSession', () => {
  it('로그인 응답의 토큰으로 사용자 정보를 불러온다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, userBody))

    await startSession('login-token')

    expect(authHeaderOf(0)).toBe('Bearer login-token')
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('사용자 조회에 실패하면 상태를 초기화하고 에러를 던진다', async () => {
    useAuthStore.getState().setAccessToken('login-token')
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'INTERNAL'))

    await expect(loadSession()).rejects.toMatchObject({ code: 'INTERNAL' })

    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})

describe('setupAuth (API 클라이언트 연결)', () => {
  it('TOKEN_EXPIRED이면 refresh로 받은 토큰을 저장하고 재시도한다', async () => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'expired' })
    fetchMock
      .mockResolvedValueOnce(errorResponse(401, 'TOKEN_EXPIRED'))
      .mockResolvedValueOnce(jsonResponse(200, tokenBody('fresh')))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))

    const result = await apiRequest<{ ok: boolean }>('/workouts')

    expect(result).toEqual({ ok: true })
    expect(authHeaderOf(0)).toBe('Bearer expired')
    expect(urlOf(1)).toBe('/api/auth/refresh')
    expect(authHeaderOf(2)).toBe('Bearer fresh')
    expect(useAuthStore.getState().accessToken).toBe('fresh')
  })

  it('앱 시작 refresh와 TOKEN_EXPIRED 재시도가 겹쳐도 refresh는 한 번이다', async () => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'expired' })
    fetchMock.mockImplementation(async (input) => {
      if (input === '/api/auth/refresh') {
        return jsonResponse(200, tokenBody('fresh'))
      }
      const token = useAuthStore.getState().accessToken
      return token === 'fresh'
        ? jsonResponse(200, userBody)
        : errorResponse(401, 'TOKEN_EXPIRED')
    })

    await Promise.all([initializeAuth(), apiRequest('/workouts')])

    const refreshCalls = fetchMock.mock.calls.filter(
      ([url]) => url === '/api/auth/refresh',
    )
    expect(refreshCalls).toHaveLength(1)
  })

  it('refresh가 실패하면 인증 상태를 초기화한다', async () => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'expired' })
    fetchMock
      .mockResolvedValueOnce(errorResponse(401, 'TOKEN_EXPIRED'))
      .mockResolvedValueOnce(errorResponse(401, 'REFRESH_INVALID'))

    await expect(apiRequest('/workouts')).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
    })

    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('UNAUTHORIZED를 받으면 인증 상태를 초기화한다', async () => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'forged' })
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'UNAUTHORIZED'))

    await expect(apiRequest('/workouts')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })

    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })
})

describe('logout', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' })
  })

  it('서버에 로그아웃을 요청하고 상태를 비운다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204))

    await logout()

    expect(urlOf(0)).toBe('/api/auth/logout')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('서버 요청이 실패해도 이 기기의 상태는 비운다', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await logout()

    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })
})
