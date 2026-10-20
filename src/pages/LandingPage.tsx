import { useAuth } from '../features/auth'
import {
  FeatureTiles,
  FinalCta,
  HowItWorks,
  LandingHero,
} from '../features/landing'
import ButtonLink from '../shared/components/ButtonLink'

// 누구나 볼 수 있는 첫 화면. 로그인 상태에 따라 다음 행동 버튼만 바뀐다.
// features끼리는 서로 import하지 않으므로, 인증 상태는 여기서 읽어 landing에 넘긴다.
function LandingPage() {
  const { status, user } = useAuth()

  const startButton = (
    <ButtonLink to="/signup" variant="brand" size="lg">
      시작하기
    </ButtonLink>
  )
  // 첫 화면에는 이미 계정이 있는 사람을 위한 로그인도 함께 둔다.
  const visitorActions = (
    <>
      {startButton}
      <ButtonLink to="/login" variant="brand-outline" size="lg">
        로그인
      </ButtonLink>
    </>
  )
  const memberActions = user && (
    <ButtonLink
      to={user.onboardingCompleted ? '/home' : '/onboarding'}
      variant="brand"
      size="lg"
    >
      {user.onboardingCompleted ? '내 홈으로 가기' : '가입 마무리하기'}
    </ButtonLink>
  )

  // 세션을 복구하는 동안(initializing)에는 버튼을 비워 둔다. 잠깐 틀린 버튼이 보이는 것을 막는다.
  const actions =
    status === 'unauthenticated'
      ? visitorActions
      : status === 'authenticated'
        ? memberActions
        : null

  return (
    <main>
      <LandingHero actions={actions} />
      <FeatureTiles />
      <HowItWorks />
      {status !== 'authenticated' && (
        <FinalCta actions={status === 'unauthenticated' ? startButton : null} />
      )}
    </main>
  )
}

export default LandingPage
