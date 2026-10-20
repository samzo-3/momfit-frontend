import { Navigate } from 'react-router-dom'
import LoadingScreen from '../../../shared/components/LoadingScreen'
import { useAuth } from '../hooks/useAuth'

// 카카오 로그인이 끝나면 백엔드가 refresh 쿠키를 심고 이 화면으로 보낸다.
// 앱이 시작될 때 이미 refresh로 세션을 복구하므로, 여기서는 그 결과를 기다렸다가 갈 곳만 정한다.
function AuthCallbackHandler() {
  const { status, user } = useAuth()

  if (status === 'initializing') return <LoadingScreen />
  // 쿠키가 없거나 세션을 만들지 못했다면 로그인 화면에서 다시 시도하게 한다.
  if (!user) return <Navigate to="/login?error=provider_error" replace />
  return (
    <Navigate to={user.onboardingCompleted ? '/home' : '/onboarding'} replace />
  )
}

export default AuthCallbackHandler
