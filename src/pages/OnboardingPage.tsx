import PageShell from '../shared/components/PageShell'

// 화면 구현 전까지 라우팅 대상으로만 쓰는 자리 표시 화면이다.
function OnboardingPage() {
  return (
    <PageShell title="온보딩">
      <p className="text-ink-secondary">준비 중입니다.</p>
    </PageShell>
  )
}

export default OnboardingPage
