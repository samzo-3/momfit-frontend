import { useMutation, useQuery } from '@tanstack/react-query'
import {
  requestCheckLoginId,
  requestDeleteAccount,
  requestLogin,
  requestOnboarding,
  requestRestoreAccount,
  requestRestoreInfo,
  requestResetPassword,
  requestSendEmailCode,
  requestSignup,
  requestUpdateProfile,
  requestVerifyEmailCode,
} from '../api/auth-api'
import { setCurrentUser, startSession } from '../auth-session'
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

// 탈퇴 유예 중인 계정의 복구 일정. 복구용 쿠키가 만료됐으면 오류가 되므로 재시도하지 않는다.
export function useRestoreInfo() {
  return useQuery({
    queryKey: ['auth', 'restore-info'],
    queryFn: requestRestoreInfo,
    retry: false,
    // 같은 계정을 다시 탈퇴했을 때 이전 일정이 남지 않도록 캐시하지 않는다.
    gcTime: 0,
  })
}

// 복구하면 로그인된 것으로 보고 세션을 시작한다. 세션이 시작되면 라우트 가드가 화면을 이동시킨다.
export function useRestoreAccount() {
  return useMutation({
    mutationFn: async () => {
      const { access_token } = await requestRestoreAccount()
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

export function useUpdateProfile() {
  return useMutation({
    mutationFn: requestUpdateProfile,
    onSuccess: setCurrentUser,
  })
}

// 인증 상태 정리와 화면 이동은 호출하는 쪽에서 순서를 정한다.
export function useDeleteAccount() {
  return useMutation({ mutationFn: requestDeleteAccount })
}

// 온보딩을 마치면 현재 사용자를 갱신한다. 라우트 가드가 알맞은 화면으로 이동시킨다.
export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: requestOnboarding,
    onSuccess: setCurrentUser,
  })
}
