import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingScreen from '../../../shared/components/LoadingScreen'
import { useAuth } from '../hooks/useAuth'

interface RedirectState {
  from?: { pathname?: string }
}

// 로그인하지 않은 사용자용 경로(/login, /signup 등). 로그인한 사용자는 돌려보낸다.
// 보호 경로에서 로그인으로 넘어온 경우(state.from)에는 로그인 직후 원래 경로로 보낸다.
function PublicOnlyRoute() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'initializing') return <LoadingScreen />
  if (user) {
    if (!user.onboardingCompleted) return <Navigate to="/onboarding" replace />
    const from = (location.state as RedirectState | null)?.from?.pathname
    return <Navigate to={from ?? '/'} replace />
  }
  return <Outlet />
}

export default PublicOnlyRoute
