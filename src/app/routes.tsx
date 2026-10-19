import type { RouteObject } from 'react-router-dom'
import { OnboardingRoute, PublicOnlyRoute, RequireAuth } from '../features/auth'
import AppLayout from './AppLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import OnboardingPage from '../pages/OnboardingPage'
import PasswordResetPage from '../pages/PasswordResetPage'
import SignupPage from '../pages/SignupPage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      {
        // 로그인하지 않은 사용자용. 로그인한 사용자는 /로 보낸다.
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
        children: [{ path: '/', element: <HomePage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
