import { useAuthStore } from '../features/auth/store/auth-store'
import type { User } from '../features/auth/types'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    provider: 'local',
    loginId: 'momfit01',
    nickname: '맘핏',
    email: 'mom@example.com',
    dueDate: '2027-01-11',
    pregnancyWeek: 28,
    exerciseLevel: 'low',
    onboardingCompleted: true,
    ...overrides,
  }
}

export function resetAuthStore() {
  useAuthStore.setState({
    status: 'initializing',
    accessToken: null,
    user: null,
  })
}

export function signIn(overrides: Partial<User> = {}) {
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: 'token',
    user: makeUser(overrides),
  })
}

export function signOut() {
  useAuthStore.getState().clear()
}

export function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(status: number, code: string) {
  return jsonResponse(status, { error: { code, message: `${code} 메시지` } })
}

export const userBody = {
  id: 1,
  provider: 'local',
  login_id: 'momfit01',
  nickname: '맘핏',
  email: 'mom@example.com',
  due_date: '2027-01-11',
  pregnancy_week: 28,
  exercise_level: 'low',
  onboarding_completed: true,
}
