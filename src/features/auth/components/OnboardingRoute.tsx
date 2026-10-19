import { Navigate, Outlet } from 'react-router-dom'
import LoadingScreen from '../../../shared/components/LoadingScreen'
import { useAuth } from '../hooks/useAuth'

// 로그인했지만 온보딩을 마치지 않은 사용자만 통과시킨다.
function OnboardingRoute() {
  const { status, user } = useAuth()

  if (status === 'initializing') return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.onboardingCompleted) return <Navigate to="/home" replace />
  return <Outlet />
}

export default OnboardingRoute
