// 백엔드 응답 형식 (docs/auth-api.md)

export type ExerciseLevel = 'low' | 'medium' | 'high'

export interface User {
  id: number
  provider: 'local' | 'kakao'
  loginId: string | null
  nickname: string
  email: string | null
  dueDate: string | null
  pregnancyWeek: number | null
  exerciseLevel: ExerciseLevel | null
  onboardingCompleted: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated'

// PATCH /users/me로 보낼 수 있는 항목. 바꿀 항목만 담는다.
export interface ProfilePatch {
  nickname?: string
  dueDate?: string
  exerciseLevel?: ExerciseLevel
}

export interface OnboardingInput {
  nickname: string
  dueDate: string
  exerciseLevel: ExerciseLevel
  consents: { terms: boolean; healthData: boolean }
}

export type EmailPurpose = 'signup' | 'password_reset'

export interface SignupInput {
  loginId: string
  password: string
  nickname: string
  email: string
  emailVerificationToken: string
  dueDate: string
  exerciseLevel: ExerciseLevel
  consents: { terms: boolean; healthData: boolean }
}

// 탈퇴 유예 중인 계정의 복구 화면에 보여줄 일정. 서버가 UTC(ISO 8601)로 내려준다.
export interface RestoreInfo {
  withdrawnAt: string
  purgeAt: string
}

export interface EmailVerificationResult {
  emailVerificationToken: string
  expiresIn: number
}
