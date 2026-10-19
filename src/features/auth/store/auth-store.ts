import { create } from 'zustand'
import type { AuthStatus, User } from '../types'

// access 토큰은 XSS 노출을 줄이기 위해 메모리에만 두고 persist하지 않는다. (docs/auth-api.md)
interface AuthState {
  status: AuthStatus
  accessToken: string | null
  user: User | null
  // refresh로 받은 토큰을 보관한다. 사용자 조회가 끝나기 전에도 요청에 쓸 수 있어야 한다.
  setAccessToken: (token: string) => void
  setSession: (user: User) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'initializing',
  accessToken: null,
  user: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setSession: (user) => set({ status: 'authenticated', user }),
  clear: () =>
    set({ status: 'unauthenticated', accessToken: null, user: null }),
}))
