import { configureApiClient } from '../../shared/api'
import { fetchMe, requestLogout, requestRefresh } from './api/auth-api'
import type { User } from './types'
import { useAuthStore } from './store/auth-store'

let refreshInFlight: Promise<string | null> | null = null
let initializeInFlight: Promise<void> | null = null

// 새 access 토큰을 받아 저장한다. 실패하면 null.
// 서버는 이미 쓴 refresh 토큰이 다시 오면 탈취로 보고 로그인 전체를 폐기하므로,
// 앱 시작(StrictMode의 이중 실행 포함)과 TOKEN_EXPIRED 재시도가 겹쳐도 요청은 하나만 보낸다.
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = requestRefresh()
      .then(({ access_token }) => {
        useAuthStore.getState().setAccessToken(access_token)
        return access_token
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

// 이미 access 토큰이 저장된 상태에서 사용자 정보를 불러와 로그인 상태로 만든다.
// 로그인·가입 직후에도 같은 경로를 쓴다. 실패하면 인증 상태를 초기화하고 에러를 다시 던진다.
export async function loadSession(): Promise<void> {
  try {
    useAuthStore.getState().setSession(await fetchMe())
  } catch (error) {
    useAuthStore.getState().clear()
    throw error
  }
}

// 로그인·가입 응답으로 받은 access 토큰으로 세션을 시작한다.
export async function startSession(accessToken: string): Promise<void> {
  useAuthStore.getState().setAccessToken(accessToken)
  await loadSession()
}

// 앱 시작 시 refresh 쿠키로 세션을 복구한다. 동시에 여러 번 호출해도 한 번만 실행한다.
export function initializeAuth(): Promise<void> {
  if (!initializeInFlight) {
    initializeInFlight = (async () => {
      const token = await refreshAccessToken()
      if (!token) {
        useAuthStore.getState().clear()
        return
      }
      await loadSession().catch(() => {
        // loadSession이 이미 인증 상태를 초기화했다.
      })
    })().finally(() => {
      initializeInFlight = null
    })
  }
  return initializeInFlight
}

// 내 정보를 수정한 뒤 화면 전체가 같은 값을 보도록 현재 사용자를 갱신한다.
export function setCurrentUser(user: User) {
  useAuthStore.getState().setSession(user)
}

// 서버에서 계정이 삭제된 뒤 이 기기의 인증 상태를 지운다. (서버 요청 없음)
export function clearSession() {
  useAuthStore.getState().clear()
}

export async function logout(): Promise<void> {
  try {
    await requestLogout()
  } catch {
    // 서버 요청이 실패해도 이 기기의 세션은 지운다.
  } finally {
    useAuthStore.getState().clear()
  }
}

// 공통 API 클라이언트에 인증 상태를 연결한다. 앱 시작 시 한 번 호출한다.
export function setupAuth() {
  configureApiClient({
    getAccessToken: () => useAuthStore.getState().accessToken,
    refreshAccessToken,
    onAuthFailure: () => useAuthStore.getState().clear(),
  })
}
