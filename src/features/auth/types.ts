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

export interface EmailVerificationResult {
  emailVerificationToken: string
  expiresIn: number
}
