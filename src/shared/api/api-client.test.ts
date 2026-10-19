import { apiRequest, configureApiClient } from './api-client'
import { ApiError } from './api-error'

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, code: string, extra = {}) {
  return jsonResponse(status, {
    error: { code, message: `${code} 메시지`, ...extra },
  })
}

const fetchMock = vi.fn<typeof fetch>()

function headersOf(callIndex: number) {
  const init = fetchMock.mock.calls[callIndex][1]
  return new Headers(init?.headers)
}

function setup(
  overrides: Partial<Parameters<typeof configureApiClient>[0]> = {},
) {
  const handlers = {
    getAccessToken: vi.fn<() => string | null>(() => 'old-token'),
    refreshAccessToken: vi.fn<() => Promise<string | null>>(
      async () => 'new-token',
    ),
    onAuthFailure: vi.fn(),
    ...overrides,
  }
  configureApiClient(handlers)
  return handlers
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  setup()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('/api prefix와 Bearer 헤더를 붙여 요청한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }))

    const result = await apiRequest<{ id: number }>('/users/me')

    expect(result).toEqual({ id: 1 })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/users/me')
    expect(headersOf(0).get('Authorization')).toBe('Bearer old-token')
  })

  it('auth: false이면 Authorization 헤더를 붙이지 않는다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { available: true }))

    await apiRequest('/auth/check-login-id', {
      auth: false,
      query: { login_id: 'momfit01' },
    })

    expect(headersOf(0).has('Authorization')).toBe(false)
  })

  it('query에서 null/undefined는 제외하고 쿼리 문자열을 만든다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}))

    await apiRequest('/x', {
      query: { a: 'b c', n: 1, skip: undefined, none: null },
    })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/x?a=b+c&n=1')
  })

  it('body를 JSON으로 직렬화하고 Content-Type을 지정한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}))

    await apiRequest('/auth/login', {
      method: 'POST',
      body: { login_id: 'momfit01' },
      auth: false,
    })

    const init = fetchMock.mock.calls[0][1]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"login_id":"momfit01"}')
    expect(headersOf(0).get('Content-Type')).toBe('application/json')
  })

  it('204 응답은 undefined를 반환한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204))

    await expect(
      apiRequest('/auth/logout', { method: 'POST' }),
    ).resolves.toBeUndefined()
  })
})

describe('에러 처리', () => {
  it('공통 에러 형식을 ApiError로 변환한다', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(422, 'VALIDATION_ERROR', {
        fields: { password: '8자 이상' },
      }),
    )

    const error = await apiRequest('/auth/signup', {
      method: 'POST',
      auth: false,
    }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      fields: { password: '8자 이상' },
    })
  })

  it('JSON이 아닌 에러 응답은 UNKNOWN 코드로 처리한다', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html>Bad Gateway</html>', { status: 502 }),
    )

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      status: 502,
      code: 'UNKNOWN',
    })
  })

  it('네트워크 오류는 NETWORK_ERROR로 변환한다', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })

  it('REFRESH_INVALID를 받으면 onAuthFailure를 호출한다', async () => {
    const handlers = setup()
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'REFRESH_INVALID'))

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      code: 'REFRESH_INVALID',
    })
    expect(handlers.onAuthFailure).toHaveBeenCalledTimes(1)
    expect(handlers.refreshAccessToken).not.toHaveBeenCalled()
  })

  it('INVALID_CREDENTIALS는 refresh 없이 그대로 에러로 올린다', async () => {
    const handlers = setup()
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'INVALID_CREDENTIALS'))

    await expect(
      apiRequest('/auth/login', { method: 'POST', auth: false }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(handlers.refreshAccessToken).not.toHaveBeenCalled()
    expect(handlers.onAuthFailure).not.toHaveBeenCalled()
  })
})

describe('TOKEN_EXPIRED 처리', () => {
  it('refresh 후 새 토큰으로 원 요청을 한 번 재시도한다', async () => {
    const handlers = setup()
    fetchMock
      .mockResolvedValueOnce(errorResponse(401, 'TOKEN_EXPIRED'))
      .mockResolvedValueOnce(jsonResponse(200, { id: 1 }))

    const result = await apiRequest<{ id: number }>('/users/me')

    expect(result).toEqual({ id: 1 })
    expect(handlers.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(headersOf(1).get('Authorization')).toBe('Bearer new-token')
  })

  it('동시에 여러 요청이 만료돼도 refresh는 한 번만 보낸다', async () => {
    const handlers = setup()
    fetchMock.mockImplementation(async (_url, init) => {
      const token = new Headers(init?.headers).get('Authorization')
      return token === 'Bearer new-token'
        ? jsonResponse(200, {})
        : errorResponse(401, 'TOKEN_EXPIRED')
    })

    await Promise.all([apiRequest('/a'), apiRequest('/b'), apiRequest('/c')])

    expect(handlers.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('refresh가 실패하면 onAuthFailure를 호출하고 원래 에러를 던진다', async () => {
    const handlers = setup({ refreshAccessToken: vi.fn(async () => null) })
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'TOKEN_EXPIRED'))

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
    })
    expect(handlers.onAuthFailure).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refresh가 throw해도 onAuthFailure를 호출한다', async () => {
    const handlers = setup({
      refreshAccessToken: vi.fn(async () => {
        throw new Error('boom')
      }),
    })
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'TOKEN_EXPIRED'))

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
    })
    expect(handlers.onAuthFailure).toHaveBeenCalledTimes(1)
  })

  it('재시도도 401이면 반복하지 않고 에러를 던진다', async () => {
    const handlers = setup()
    fetchMock.mockImplementation(async () =>
      errorResponse(401, 'TOKEN_EXPIRED'),
    )

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
    })
    expect(handlers.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('auth: false 요청은 TOKEN_EXPIRED여도 refresh하지 않는다', async () => {
    const handlers = setup()
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'TOKEN_EXPIRED'))

    await expect(
      apiRequest('/auth/refresh', { method: 'POST', auth: false }),
    ).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' })
    expect(handlers.refreshAccessToken).not.toHaveBeenCalled()
  })
})
