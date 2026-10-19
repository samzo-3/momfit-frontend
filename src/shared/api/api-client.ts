import { ApiError, toApiError } from './api-error'

// 브라우저 입장에서 same-origin이 되도록 Vercel rewrites / Vite proxy가 /api를 백엔드로 보낸다.
export const API_PREFIX = '/api'

export interface ApiClientHandlers {
  getAccessToken: () => string | null
  // 새 access token을 반환한다. 갱신할 수 없으면 null을 반환하거나 throw한다.
  refreshAccessToken: () => Promise<string | null>
  // 인증을 복구할 수 없을 때(refresh 실패, REFRESH_INVALID) 호출한다.
  onAuthFailure: () => void
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
  // false이면 Authorization 헤더를 붙이지 않고 TOKEN_EXPIRED 재시도도 하지 않는다.
  auth?: boolean
}

const noopHandlers: ApiClientHandlers = {
  getAccessToken: () => null,
  refreshAccessToken: async () => null,
  onAuthFailure: () => {},
}

let handlers: ApiClientHandlers = noopHandlers
let refreshInFlight: Promise<string | null> | null = null

export function configureApiClient(next: ApiClientHandlers) {
  handlers = next
  refreshInFlight = null
}

// 동시에 여러 요청이 TOKEN_EXPIRED를 받아도 refresh는 한 번만 보낸다.
function refreshOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = handlers
      .refreshAccessToken()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

function buildUrl(path: string, query: ApiRequestOptions['query']): string {
  const url = `${API_PREFIX}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) params.set(key, String(value))
  }
  const search = params.toString()
  return search ? `${url}?${search}` : url
}

async function send(
  path: string,
  options: ApiRequestOptions,
  token: string | null,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '네트워크 연결을 확인해 주세요.')
  }
}

export async function apiRequest<T = void>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const useAuth = options.auth ?? true
  let response = await send(
    path,
    options,
    useAuth ? handlers.getAccessToken() : null,
  )

  if (!response.ok && useAuth && response.status === 401) {
    const error = await toApiError(response)

    if (error.code === 'TOKEN_EXPIRED') {
      const token = await refreshOnce()
      if (!token) {
        handlers.onAuthFailure()
        throw error
      }
      // 재시도는 한 번만 한다. 또 401이면 그대로 에러로 올린다.
      response = await send(path, options, token)
    } else {
      if (error.code === 'REFRESH_INVALID') handlers.onAuthFailure()
      throw error
    }
  }

  if (!response.ok) {
    const error = await toApiError(response)
    if (error.code === 'REFRESH_INVALID') handlers.onAuthFailure()
    throw error
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
