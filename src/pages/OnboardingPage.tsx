import { OnboardingForm, useAuth } from '../features/auth'
import PageShell from '../shared/components/PageShell'

function OnboardingPage() {
  const { user } = useAuth()

  // OnboardingRoute가 로그인 상태를 보장하지만, 타입상 user는 null일 수 있다.
  if (!user) return null

  return (
    <PageShell
      tone="warm"
      title="추가 정보 입력"
      description="카카오 계정으로 가입을 마무리하려면 몇 가지 정보가 필요해요."
    >
      <OnboardingForm user={user} />
    </PageShell>
  )
}

export default OnboardingPage
