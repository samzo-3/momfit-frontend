import { useMutation } from '@tanstack/react-query'
import {
  requestCheckLoginId,
  requestLogin,
  requestResetPassword,
  requestSendEmailCode,
  requestSignup,
  requestVerifyEmailCode,
} from '../api/auth-api'
import { startSession } from '../auth-session'
import type { SignupInput } from '../types'

// 로그인·가입 성공 시 받은 access 토큰으로 세션을 시작한다.
// 세션이 시작되면 라우트 가드가 알맞은 화면으로 이동시킨다.
export function useLogin() {
  return useMutation({
    mutationFn: async (input: { loginId: string; password: string }) => {
      const { access_token } = await requestLogin(input)
      await startSession(access_token)
    },
  })
}

export function useSignup() {
  return useMutation({
    mutationFn: async (input: SignupInput) => {
      const { access_token } = await requestSignup(input)
      await startSession(access_token)
    },
  })
}

export function useCheckLoginId() {
  return useMutation({ mutationFn: requestCheckLoginId })
}

export function useSendEmailCode() {
  return useMutation({ mutationFn: requestSendEmailCode })
}

export function useVerifyEmailCode() {
  return useMutation({ mutationFn: requestVerifyEmailCode })
}

export function useResetPassword() {
  return useMutation({ mutationFn: requestResetPassword })
}
