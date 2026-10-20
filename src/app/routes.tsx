import type { RouteObject } from 'react-router-dom'
import { OnboardingRoute, PublicOnlyRoute, RequireAuth } from '../features/auth'
import AppLayout from './AppLayout'
import AuthCallbackPage from '../pages/AuthCallbackPage'
import HomePage from '../pages/HomePage'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import MePage from '../pages/MePage'
import NotFoundPage from '../pages/NotFoundPage'
import OnboardingPage from '../pages/OnboardingPage'
import PasswordResetPage from '../pages/PasswordResetPage'
import SignupPage from '../pages/SignupPage'
import WorkoutsPage from '../pages/WorkoutsPage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      // 누구나 볼 수 있는 첫 화면
      { path: '/', element: <LandingPage /> },
      // 카카오 로그인 후 백엔드가 보내는 곳. 아직 로그인 상태가 아니므로 가드 밖에 둔다.
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      {
        // 로그인하지 않은 사용자용. 로그인한 사용자는 /home으로 보낸다.
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
          { path: '/password/reset', element: <PasswordResetPage /> },
        ],
      },
      {
        // 로그인했지만 온보딩 전인 사용자용
        element: <OnboardingRoute />,
        children: [{ path: '/onboarding', element: <OnboardingPage /> }],
      },
      {
        // 로그인한 사용자만. 이후 보호 경로는 여기에 추가한다.
        element: <RequireAuth />,
        children: [
          { path: '/home', element: <HomePage /> },
          { path: '/workouts', element: <WorkoutsPage /> },
          { path: '/me', element: <MePage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
