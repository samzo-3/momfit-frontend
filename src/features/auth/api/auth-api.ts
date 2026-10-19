import { apiRequest } from '../../../shared/api'
import type { ExerciseLevel, TokenResponse, User } from '../types'

// 서버는 snake_case로 응답한다. 앱 안에서는 camelCase User를 쓴다.
interface UserResponse {
  id: number
  provider: 'local' | 'kakao'
  login_id: string | null
  nickname: string
  email: string | null
  due_date: string | null
  pregnancy_week: number | null
  exercise_level: ExerciseLevel | null
  onboarding_completed: boolean
}

function toUser(response: UserResponse): User {
  return {
    id: response.id,
    provider: response.provider,
    loginId: response.login_id,
    nickname: response.nickname,
    email: response.email,
    dueDate: response.due_date,
    pregnancyWeek: response.pregnancy_week,
    exerciseLevel: response.exercise_level,
    onboardingCompleted: response.onboarding_completed,
  }
}

// refresh 쿠키로 새 access 토큰을 받는다. Bearer가 필요 없으므로 auth: false.
export function requestRefresh(): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/refresh', {
    method: 'POST',
    auth: false,
  })
}

export async function fetchMe(): Promise<User> {
  return toUser(await apiRequest<UserResponse>('/users/me'))
}

export function requestLogout(): Promise<void> {
  return apiRequest('/auth/logout', { method: 'POST', auth: false })
}
