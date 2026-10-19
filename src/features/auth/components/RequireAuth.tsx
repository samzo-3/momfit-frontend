import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingScreen from '../../../shared/components/LoadingScreen'
import { useAuth } from '../hooks/useAuth'

// 로그인한 사용자만 통과시킨다. 온보딩이 끝나지 않았으면 /onboarding으로 보낸다.
function RequireAuth() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'initializing') return <LoadingScreen />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
}

export default RequireAuth
