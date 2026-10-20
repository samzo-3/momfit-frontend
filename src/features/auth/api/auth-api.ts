import { apiRequest } from '../../../shared/api'
import type {
  EmailPurpose,
  EmailVerificationResult,
  ExerciseLevel,
  OnboardingInput,
  ProfilePatch,
  RestoreInfo,
  SignupInput,
  TokenResponse,
  User,
} from '../types'

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

export function requestLogin(input: {
  loginId: string
  password: string
}): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { login_id: input.loginId, password: input.password },
  })
}

// 탈퇴 유예 중인 계정이 로그인하면 서버가 복구용 쿠키를 내려준다. 그 쿠키로 일정을 조회하고 복구한다.
export async function requestRestoreInfo(): Promise<RestoreInfo> {
  const response = await apiRequest<{ withdrawn_at: string; purge_at: string }>(
    '/auth/restore',
    { auth: false },
  )
  return { withdrawnAt: response.withdrawn_at, purgeAt: response.purge_at }
}

export function requestRestoreAccount(): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/restore', {
    method: 'POST',
    auth: false,
  })
}

export function requestSignup(input: SignupInput): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/signup', {
    method: 'POST',
    auth: false,
    body: {
      login_id: input.loginId,
      password: input.password,
      nickname: input.nickname,
      email: input.email,
      email_verification_token: input.emailVerificationToken,
      due_date: input.dueDate,
      exercise_level: input.exerciseLevel,
      consents: {
        terms: input.consents.terms,
        health_data: input.consents.healthData,
      },
    },
  })
}

export async function requestCheckLoginId(loginId: string): Promise<boolean> {
  const { available } = await apiRequest<{ available: boolean }>(
    '/auth/check-login-id',
    { auth: false, query: { login_id: loginId } },
  )
  return available
}

export function requestSendEmailCode(input: {
  email: string
  purpose: EmailPurpose
}): Promise<void> {
  return apiRequest('/auth/email/send-code', {
    method: 'POST',
    auth: false,
    body: input,
  })
}

export async function requestVerifyEmailCode(input: {
  email: string
  code: string
  purpose: EmailPurpose
}): Promise<EmailVerificationResult> {
  const response = await apiRequest<{
    email_verification_token: string
    expires_in: number
  }>('/auth/email/verify-code', {
    method: 'POST',
    auth: false,
    body: input,
  })
  return {
    emailVerificationToken: response.email_verification_token,
    expiresIn: response.expires_in,
  }
}

export function requestResetPassword(input: {
  email: string
  emailVerificationToken: string
  newPassword: string
}): Promise<void> {
  return apiRequest('/auth/password/reset', {
    method: 'POST',
    auth: false,
    body: {
      email: input.email,
      email_verification_token: input.emailVerificationToken,
      new_password: input.newPassword,
    },
  })
}

export async function requestUpdateProfile(patch: ProfilePatch): Promise<User> {
  const body: Record<string, string> = {}
  if (patch.nickname !== undefined) body.nickname = patch.nickname
  if (patch.dueDate !== undefined) body.due_date = patch.dueDate
  if (patch.exerciseLevel !== undefined) {
    body.exercise_level = patch.exerciseLevel
  }
  return toUser(
    await apiRequest<UserResponse>('/users/me', { method: 'PATCH', body }),
  )
}

export function requestDeleteAccount(): Promise<void> {
  return apiRequest('/users/me', { method: 'DELETE' })
}

// 카카오로 처음 가입한 사용자가 동의와 초기 프로필을 제출한다.
export async function requestOnboarding(input: OnboardingInput): Promise<User> {
  return toUser(
    await apiRequest<UserResponse>('/users/me/onboarding', {
      method: 'POST',
      body: {
        nickname: input.nickname,
        due_date: input.dueDate,
        exercise_level: input.exerciseLevel,
        consents: {
          terms: input.consents.terms,
          health_data: input.consents.healthData,
        },
      },
    }),
  )
}
