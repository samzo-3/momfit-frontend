import { Navigate, Outlet } from 'react-router-dom'
import LoadingScreen from '../../../shared/components/LoadingScreen'
import { useAuth } from '../hooks/useAuth'

// 로그인하지 않은 사용자용 경로(/login, /signup). 로그인한 사용자는 돌려보낸다.
function PublicOnlyRoute() {
  const { status, user } = useAuth()

  if (status === 'initializing') return <LoadingScreen />
  if (user) {
    return (
      <Navigate to={user.onboardingCompleted ? '/' : '/onboarding'} replace />
    )
  }
  return <Outlet />
}

export default PublicOnlyRoute
