import type { RouteObject } from 'react-router-dom'
import {
  OnboardingRoute,
  PublicOnlyRoute,
  RequireAdmin,
  RequireAuth,
  RequireMember,
} from '../features/auth'
import AppLayout from './AppLayout'
import AccountRestorePage from '../pages/AccountRestorePage'
import AuthCallbackPage from '../pages/AuthCallbackPage'
import HomePage from '../pages/HomePage'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import MePage from '../pages/MePage'
import NotFoundPage from '../pages/NotFoundPage'
import OnboardingPage from '../pages/OnboardingPage'
import PasswordResetPage from '../pages/PasswordResetPage'
import RecordsPage from '../pages/RecordsPage'
import SignupPage from '../pages/SignupPage'
import WorkoutsPage from '../pages/WorkoutsPage'
import { SideKickStudyScreen } from '../features/pose/components/SideKickStudyScreen'
import SideKickExerciseScreen from '../features/pose/components/SideKickExerciseScreen'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      // 개발 환경 전용: 로그인 없이 STUDY 웹캠 검증
      ...(import.meta.env.DEV
        ? [
            {
              path: '/dev/sidekick/study',
              element: <SideKickStudyScreen />,
            },
            {
              path: '/dev/sidekick/exercise',
              element: <SideKickExerciseScreen />,
            },
          ]
        : []),
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
          // 탈퇴 유예 중인 계정이 로그인하면 오는 복구 화면 (카카오 로그인도 여기로 보낸다)
          { path: '/account/restore', element: <AccountRestorePage /> },
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
          {
            // 서비스를 이용하는 회원용. 관리자는 /admin으로 보낸다.
            element: <RequireMember />,
            children: [
              { path: '/home', element: <HomePage /> },
              { path: '/workouts', element: <WorkoutsPage /> },
              { path: '/records', element: <RecordsPage /> },
              {
                path: '/workouts/sidekick/study',
                element: <SideKickStudyScreen />,
              },
              {
                path: '/workouts/sidekick/exercise',
                element: <SideKickExerciseScreen />,
              },
              { path: '/me', element: <MePage /> },
            ],
          },
          {
            // 관리자만. 화면 코드는 관리자가 들어갈 때만 내려받는다. (실제 보안은 서버의 /api/admin/* 가드)
            element: <RequireAdmin />,
            children: [
              {
                path: '/admin',
                lazy: async () => ({
                  Component: (await import('../pages/AdminPage')).default,
                }),
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
